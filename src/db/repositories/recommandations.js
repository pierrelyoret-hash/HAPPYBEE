import { db } from '../db.js';
import { creerTache } from './taches.js';

// Convention propre au moteur (regle.urgence, 1-3) → priorite de tache
// (chaîne, déjà utilisée partout ailleurs dans l'application).
const PRIORITE_PAR_URGENCE = { 1: 'faible', 2: 'moyenne', 3: 'urgente' };

// L3b.10 / §8 garde-fou n°5 : jamais plus de deux recommandations urgentes
// (urgence 3) actives (statut 'proposee') par rucher — "une application qui
// recommande trop est désactivée en trois semaines". Les recommandations
// urgence 1-2 ne sont pas plafonnées : seule l'urgence maximale sature vite
// la confiance de l'exploitant.
const PLAFOND_URGENTES_PAR_RUCHER = 2;

export async function compterRecommandationsUrgentesActives(rucherId) {
  return db.recommandation
    .where('rucher_id')
    .equals(rucherId)
    .and((r) => !r.deleted_at && r.statut === 'proposee' && r.urgence === 3)
    .count();
}

// Anti-doublon : une recommandation "proposee" ou "validee" existe déjà
// pour ce rucher, cette règle et cet épisode précis (même date de début du
// déclencheur) — ne pas la recréer à chaque évaluation tant que
// l'exploitant n'a pas tranché (proposee) ou l'a déjà traitée en la
// validant (validee, la tâche existe déjà). Un épisode rejeté ou différé
// PEUT en revanche se représenter : voir creerRecommandationSiNouvelle.
export async function recommandationExistePourEpisode(rucherId, regleCode, dateDebutEpisode) {
  const existantes = await db.recommandation
    .where('rucher_id')
    .equals(rucherId)
    .and(
      (r) =>
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
  rucherId,
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
// l'exploitant. La tâche créée reste modifiable ensuite comme n'importe
// quelle autre (critère d'acceptation §10.5).
export async function validerRecommandation(recommandationId, { dateEcheance } = {}) {
  const recommandation = await db.recommandation.get(recommandationId);
  if (!recommandation) throw new Error('Recommandation introuvable.');
  const maintenant = new Date().toISOString();

  const tache = {
    id: crypto.randomUUID(),
    colonie_id: recommandation.colonie_id,
    rucher_id: recommandation.rucher_id,
    libelle: recommandation.enonce,
    date_echeance: dateEcheance ?? maintenant,
    priorite: PRIORITE_PAR_URGENCE[recommandation.urgence] ?? 'moyenne',
    origine: 'generee',
    regle_origine: recommandation.regle_code,
    statut: 'a_faire',
    visite_declencheuse_id: null,
    created_at: maintenant,
    updated_at: maintenant,
    deleted_at: null,
  };
  await creerTache(tache);
  await db.recommandation.update(recommandationId, {
    statut: 'validee',
    tache_id: tache.id,
    traitee_le: maintenant,
    updated_at: maintenant,
  });
  return tache;
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
