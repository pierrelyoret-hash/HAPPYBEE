import { db } from '../db.js';
import { creerTache } from './taches.js';
import { obtenirRegle } from './regles.js';

// Convention propre au moteur (regle.urgence, 1-3) → priorite de tache
// (chaîne, déjà utilisée partout ailleurs dans l'application).
const PRIORITE_PAR_URGENCE = { 1: 'faible', 2: 'moyenne', 3: 'urgente' };

// L3b.10 / §8 garde-fou n°5 : jamais plus de deux recommandations urgentes
// (urgence 3) actives (statut 'proposee') par rucher — "une application qui
// recommande trop est désactivée en trois semaines". Les recommandations
// urgence 1-2 ne sont pas plafonnées : seule l'urgence maximale sature vite
// la confiance de l'exploitant.
const PLAFOND_URGENTES_PAR_RUCHER = 2;

// .filter() plutôt que .where('rucher_id').equals() : rucherId peut être
// null (règles de portée "exploitation", ex. R-REGL-02 — la déclaration
// annuelle ne concerne pas un rucher précis) et IndexedDB n'indexe pas
// fiablement null comme clé d'égalité. Peu de lignes en jeu, un scan
// complet suffit (même choix que listerHistoriqueSanitaire).
export async function compterRecommandationsUrgentesActives(rucherId) {
  return db.recommandation
    .filter(
      (r) => r.rucher_id === rucherId && !r.deleted_at && r.statut === 'proposee' && r.urgence === 3
    )
    .count();
}

// Anti-doublon : une recommandation "proposee" ou "validee" existe déjà
// pour ce rucher (ou, si rucherId est null, à l'échelle de l'exploitation),
// cette règle et cet épisode précis (même date de début du déclencheur) —
// ne pas la recréer à chaque évaluation tant que l'exploitant n'a pas
// tranché (proposee) ou l'a déjà traitée en la validant (validee, la tâche
// existe déjà). Un épisode rejeté ou différé PEUT en revanche se
// représenter : voir creerRecommandationSiNouvelle.
export async function recommandationExistePourEpisode(rucherId, regleCode, dateDebutEpisode) {
  const existantes = await db.recommandation
    .filter(
      (r) =>
        r.rucher_id === rucherId &&
        !r.deleted_at &&
        r.regle_code === regleCode &&
        r.donnees_declenchement?.dateDebut === dateDebutEpisode &&
        (r.statut === 'proposee' || r.statut === 'validee')
    )
    .first();
  return !!existantes;
}

// Crée la recommandation si elle n'existe pas déjà pour cet épisode et si
// le plafond d'urgentes n'est pas atteint (dans ce cas, silencieux — §8
// garde-fou n°5, "le silence est une réponse valable"). Renvoie la
// recommandation créée, ou null si rien n'a été créé.
export async function creerRecommandationSiNouvelle({
  regle,
  colonieId = null,
  rucherId = null,
  enonce,
  donneesDeclenchement,
}) {
  const dejaExistante = await recommandationExistePourEpisode(
    rucherId,
    regle.code,
    donneesDeclenchement.dateDebut
  );
  if (dejaExistante) return null;

  if (regle.urgence === 3) {
    const nbUrgentes = await compterRecommandationsUrgentesActives(rucherId);
    if (nbUrgentes >= PLAFOND_URGENTES_PAR_RUCHER) return null;
  }

  const maintenant = new Date().toISOString();
  const recommandation = {
    id: crypto.randomUUID(),
    regle_code: regle.code,
    regle_version: regle.version,
    colonie_id: colonieId,
    rucher_id: rucherId,
    date_emission: maintenant,
    enonce,
    justification: regle.justification,
    sources: regle.sources,
    garde_fous: regle.garde_fous,
    urgence: regle.urgence,
    donnees_declenchement: donneesDeclenchement,
    statut: 'proposee',
    motif_rejet: null,
    differee_au: null,
    tache_id: null,
    traitee_le: null,
    created_at: maintenant,
    updated_at: maintenant,
    deleted_at: null,
  };
  await db.recommandation.add(recommandation);
  return recommandation;
}

export async function listerRecommandationsRucher(rucherId, { statut } = {}) {
  return db.recommandation
    .where('rucher_id')
    .equals(rucherId)
    .and((r) => !r.deleted_at && (statut ? r.statut === statut : true))
    .toArray();
}

export async function listerRecommandationsEnAttente() {
  return db.recommandation.filter((r) => !r.deleted_at && r.statut === 'proposee').toArray();
}

// Garde-fou §8 n°1 : c'est la SEULE façon de faire naître une tâche depuis
// une recommandation — jamais automatique, toujours un geste explicite de
// l'exploitant. La ou les tâches créées restent modifiables ensuite comme
// n'importe quelle autre (critère d'acceptation §10.5).
//
// Renvoie toujours un tableau de tâches — une seule pour la grande majorité
// des règles (une action proposée), plusieurs pour R-ORPH-01 (§2.2 :
// "l'exploitant en valide une ou plusieurs, chaque validation crée ses
// propres tâches"). `actionsChoisies` (tableau de libellés) permet de ne
// valider qu'une partie des actions proposées par la règle — sans lui,
// toutes les actions de regle.actions_proposees sont créées.
export async function validerRecommandation(recommandationId, { dateEcheance, actionsChoisies } = {}) {
  const recommandation = await db.recommandation.get(recommandationId);
  if (!recommandation) throw new Error('Recommandation introuvable.');
  const regle = await obtenirRegle(recommandation.regle_code);
  const actions = actionsChoisies ?? regle?.actions_proposees ?? [recommandation.enonce];
  const maintenant = new Date().toISOString();

  const taches = [];
  for (const libelle of actions) {
    const tache = {
      id: crypto.randomUUID(),
      colonie_id: recommandation.colonie_id,
      rucher_id: recommandation.rucher_id,
      libelle,
      date_echeance: dateEcheance ?? maintenant,
      priorite: PRIORITE_PAR_URGENCE[recommandation.urgence] ?? 'moyenne',
      origine: 'generee',
      regle_origine: recommandation.regle_code,
      statut: 'a_faire',
      visite_declencheuse_id: recommandation.donnees_declenchement?.visiteId ?? null,
      created_at: maintenant,
      updated_at: maintenant,
      deleted_at: null,
    };
    await creerTache(tache);
    taches.push(tache);
  }

  await db.recommandation.update(recommandationId, {
    statut: 'validee',
    // Référence la première tâche à titre indicatif — les autres restent
    // retrouvables par regle_origine + visite_declencheuse_id. Le schéma
    // (§5 du brief) ne prévoit qu'un seul tache_id ; pas de raison d'en
    // faire plus tant qu'aucun écran n'a besoin de la liste complète.
    tache_id: taches[0]?.id ?? null,
    traitee_le: maintenant,
    updated_at: maintenant,
  });
  return taches;
}

// Rejet non motivé accepté (rappel transverse du brief §7 : "aucun champ
// obligatoire nulle part, y compris le motif de rejet — un rejet non
// motivé reste un rejet").
export async function rejeterRecommandation(recommandationId, motif = null) {
  const maintenant = new Date().toISOString();
  return db.recommandation.update(recommandationId, {
    statut: 'rejetee',
    motif_rejet: motif,
    traitee_le: maintenant,
    updated_at: maintenant,
  });
}

export async function differerRecommandation(recommandationId, differeeAu) {
  const maintenant = new Date().toISOString();
  return db.recommandation.update(recommandationId, {
    statut: 'differee',
    differee_au: differeeAu,
    updated_at: maintenant,
  });
}
