import { db } from '../db.js';
import { CATEGORIES_PAR_DEFAUT } from '../../lib/categoriesParDefaut.js';

// Insère les catégories par défaut manquantes uniquement (même principe que
// initialiserCatalogue, src/db/repositories/regles.js) : une catégorie déjà
// présente (même `groupe`) n'est jamais réécrite, l'exploitant peut avoir
// renommé son libellé ou changé son statut actif entretemps.
//
// Toute la fonction tourne dans UNE transaction Dexie (rw, sur `categorie`
// uniquement) : IndexedDB sérialise les transactions readwrite concurrentes
// sur un même store, ce qui protège l'idempotence quand l'appelant se
// déclenche deux fois quasi simultanément — constaté en développement avec
// React.StrictMode (App.jsx double le premier rendu), qui produisait 32
// lignes au lieu de 16 sans cette protection (aucun index unique sur
// `groupe`, contrairement à `regle.code` — voir le correctif jumeau dans
// initialiserCatalogue, régles.js, qui avait le même défaut mais masqué par
// cet index).
export async function initialiserCategoriesParDefaut() {
  const maintenant = new Date().toISOString();
  await db.transaction('rw', db.categorie, async () => {
    for (const definition of CATEGORIES_PAR_DEFAUT) {
      const existante = await db.categorie.filter((c) => c.groupe === definition.groupe).first();
      if (existante) continue;
      await db.categorie.add({
        id: crypto.randomUUID(),
        ...definition,
        created_at: maintenant,
        updated_at: maintenant,
        deleted_at: null,
      });
    }
  });
}

export async function listerCategories(sens = null) {
  const categories = await db.categorie
    .filter((c) => !c.deleted_at && (sens == null || c.sens === sens))
    .toArray();
  return categories.sort((a, b) => a.libelle.localeCompare(b.libelle));
}

export async function creerCategorie(categorie) {
  const maintenant = new Date().toISOString();
  return db.categorie.add({
    id: crypto.randomUUID(),
    ...categorie,
    created_at: maintenant,
    updated_at: maintenant,
    deleted_at: null,
  });
}

export async function modifierCategorie(id, champs) {
  return db.categorie.update(id, { ...champs, updated_at: new Date().toISOString() });
}

export async function listerTiers(type = null) {
  const tiers = await db.tiers
    .filter((t) => !t.deleted_at && (type == null || t.type === type))
    .toArray();
  return tiers.sort((a, b) => a.nom.localeCompare(b.nom));
}

export async function creerTiers(tiers) {
  const maintenant = new Date().toISOString();
  const id = crypto.randomUUID();
  await db.tiers.add({
    id,
    ...tiers,
    created_at: maintenant,
    updated_at: maintenant,
    deleted_at: null,
  });
  return id;
}

export async function modifierTiers(id, champs) {
  return db.tiers.update(id, { ...champs, updated_at: new Date().toISOString() });
}

export async function supprimerTiers(id) {
  return db.tiers.update(id, { deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() });
}

export async function creerEcriture(ecriture) {
  const maintenant = new Date().toISOString();
  const id = crypto.randomUUID();
  await db.ecriture.add({
    id,
    ...ecriture,
    created_at: maintenant,
    updated_at: maintenant,
    deleted_at: null,
  });
  return id;
}

export async function modifierEcriture(id, champs) {
  return db.ecriture.update(id, { ...champs, updated_at: new Date().toISOString() });
}

export async function supprimerEcriture(id) {
  const maintenant = new Date().toISOString();
  await db.ecriture.update(id, { deleted_at: maintenant, updated_at: maintenant });
  // Une écriture supprimée ne doit plus porter d'affectation — sinon le
  // coût de revient continuerait à compter une charge que l'exploitant a
  // retirée. Suppression physique : ecriture_affectation est dérivée
  // (db.js v12), pas une donnée de l'exploitant.
  await db.ecriture_affectation.where('ecriture_id').equals(id).delete();
}

export async function obtenirEcriture(id) {
  return db.ecriture.get(id);
}

// Journal des écritures (§7 du brief), filtrable par exercice / sens /
// catégorie / rucher — tous optionnels, `null` = pas de filtre sur ce
// champ. `ecriture` n'a pas assez de lignes pour justifier un index composé
// couvrant toutes les combinaisons : un filtre en mémoire après le premier
// tri par exercice (le seul champ presque toujours fourni, l'écran ne
// montre jamais "tous les exercices" par défaut) suffit.
export async function listerEcritures({ exercice = null, sens = null, categorieId = null, rucherId = null } = {}) {
  const ecritures = await db.ecriture
    .filter(
      (e) =>
        !e.deleted_at &&
        (exercice == null || e.exercice === exercice) &&
        (sens == null || e.sens === sens) &&
        (categorieId == null || e.categorie_id === categorieId) &&
        (rucherId == null || e.rucher_id === rucherId)
    )
    .toArray();
  return ecritures.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
}

// Report du dernier tiers/catégorie/mode de règlement saisis (cadrage UX
// L4 §4, "la saisie est un journal, pas un formulaire" — même principe que
// la visite qui reporte la précédente). La plus récente par `created_at`,
// pas par `date` : c'est le dernier geste de saisie qui doit se reporter,
// pas la dernière date d'écriture (l'exploitant peut saisir une facture en
// retard sans que ça change ce qui se pré-remplit pour la suivante).
export async function obtenirDerniereEcritureSaisie() {
  const ecritures = await db.ecriture.filter((e) => !e.deleted_at).toArray();
  if (ecritures.length === 0) return null;
  return ecritures.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}

// Liste des exercices ayant au moins une écriture, du plus récent au plus
// ancien — pour le filtre "exercice" du journal et le sélecteur de la
// saisie (pré-rempli sur l'exercice courant via obtenirSaison, mais
// l'exploitant doit pouvoir choisir un exercice passé pour une facture en
// retard).
export async function listerExercicesConnus() {
  const ecritures = await db.ecriture.filter((e) => !e.deleted_at).toArray();
  return [...new Set(ecritures.map((e) => e.exercice))].sort((a, b) => b - a);
}

// L5.9, priorité S — comparaison pluriannuelle "par poste" (l'angle "par
// ruche" est couvert par tableauDeBordExercice, lib/repartitionEconomique.js,
// réemployé pour cette même vue). Montants bruts de `ecriture` (pas
// `montant_calcule` de ecriture_affectation) : un poste de dépense se
// compare tel qu'engagé, indépendamment de comment il a ensuite été
// réparti entre ruches.
export async function comparaisonParPoste() {
  const ecritures = await db.ecriture.filter((e) => !e.deleted_at).toArray();
  const categories = await listerCategories();
  const categorieParId = new Map(categories.map((c) => [c.id, c]));

  const exercices = [...new Set(ecritures.map((e) => e.exercice))].sort((a, b) => a - b);
  const parCategorie = new Map();
  for (const e of ecritures) {
    const cle = e.categorie_id ?? '_sans';
    if (!parCategorie.has(cle)) {
      parCategorie.set(cle, {
        libelle: categorieParId.get(e.categorie_id)?.libelle ?? 'Sans catégorie',
        sens: e.sens,
        parExercice: {},
        total: 0,
      });
    }
    const ligne = parCategorie.get(cle);
    ligne.parExercice[e.exercice] = (ligne.parExercice[e.exercice] ?? 0) + e.montant;
    ligne.total += e.montant;
  }

  return { exercices, lignes: [...parCategorie.values()].sort((a, b) => a.libelle.localeCompare(b.libelle)) };
}

// F6.4, justificatif photographié — premier usage réel de `document`
// (schéma inutilisé depuis L2.2, voir db.js v12). Même mécanique que
// enregistrerPhoto (src/db/repositories/photos.js) : métadonnées dans
// `document` (synchronisées en JSON), octet dans `document_blob` (transite
// par Supabase Storage à part, voir lib/sync.js).
export async function enregistrerJustificatif({ entiteLieeType, entiteLieeId, blob }) {
  const maintenant = new Date().toISOString();
  const id = crypto.randomUUID();
  await db.document.add({
    id,
    type: 'justificatif',
    date: maintenant.slice(0, 10),
    libelle: null,
    entite_liee_type: entiteLieeType,
    entite_liee_id: entiteLieeId,
    fichier_local: id,
    fichier_distant: null,
    statut_sync: 'en_attente',
    created_at: maintenant,
    updated_at: maintenant,
    deleted_at: null,
  });
  await db.document_blob.put({ document_id: id, blob });
  return id;
}

export async function obtenirJustificatif(entiteLieeType, entiteLieeId) {
  return db.document
    .where('entite_liee_id')
    .equals(entiteLieeId)
    .and((d) => !d.deleted_at && d.entite_liee_type === entiteLieeType)
    .first();
}
