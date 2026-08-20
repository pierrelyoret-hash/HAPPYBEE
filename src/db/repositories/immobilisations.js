import { db } from '../db.js';
import { obtenirSaison } from '../../lib/saison.js';
import { bornesExercice } from '../../lib/repartitionEconomique.js';

function arrondiCentime(montant) {
  return Math.round(montant * 100) / 100;
}

function joursEntre(dateIsoDebut, dateIsoFin) {
  return Math.round((new Date(dateIsoFin) - new Date(dateIsoDebut)) / 86400000);
}

function joursPortesDansExercice(exercice, dateAcquisition, dateSortie) {
  const { debut, fin } = bornesExercice(exercice);
  const debutPortee = dateAcquisition > debut ? dateAcquisition : debut;
  const finPortee = dateSortie && dateSortie < fin ? dateSortie : fin;
  if (debutPortee > finPortee) return 0;
  return joursEntre(debutPortee, finPortee) + 1;
}

// §6.4 : dotation linéaire = valeur_acquisition / duree_amortissement_annees
// (formule reprise à l'identique, valeur_residuelle n'y figure pas — captée
// sur l'immobilisation mais non exploitée dans le calcul, même traitement
// que `origine_production`). Prorata temporis sur les exercices
// d'acquisition et de sortie via le ratio jours portés / jours de
// l'exercice.
//
// Fenêtre fixe de `dureeAmortissementAnnees` exercices à partir de
// l'exercice d'acquisition ("généré... de l'acquisition jusqu'au terme",
// §6.4) : une acquisition en cours d'exercice ne prolonge pas d'un exercice
// supplémentaire pour compenser le prorata du premier — lecture littérale
// cohérente avec le critère d'acceptation n°10 ("5 dotations" pour une
// durée de 5 ans, pas 6).
export function calculerLignesDotation({ valeurAcquisition, dureeAmortissementAnnees, dateAcquisition, dateSortie = null }) {
  const dotationPleine = valeurAcquisition / dureeAmortissementAnnees;
  const exerciceAcquisition = obtenirSaison(dateAcquisition).debut;
  const lignes = [];
  for (let i = 0; i < dureeAmortissementAnnees; i++) {
    const exercice = exerciceAcquisition + i;
    const { debut, fin } = bornesExercice(exercice);
    if (dateSortie && dateSortie < debut) break;
    const jours = joursPortesDansExercice(exercice, dateAcquisition, dateSortie);
    if (jours <= 0) break;
    const joursExercice = joursEntre(debut, fin) + 1;
    lignes.push({ exercice, dotation: arrondiCentime(dotationPleine * (jours / joursExercice)) });
    if (dateSortie && dateSortie <= fin) break;
  }
  return lignes;
}

export async function creerImmobilisation(immobilisation) {
  const maintenant = new Date().toISOString();
  const id = crypto.randomUUID();
  await db.immobilisation.add({
    id,
    ...immobilisation,
    created_at: maintenant,
    updated_at: maintenant,
    deleted_at: null,
  });
  await regenererDotations(id);
  return id;
}

export async function modifierImmobilisation(id, champs) {
  await db.immobilisation.update(id, { ...champs, updated_at: new Date().toISOString() });
  await regenererDotations(id);
}

export async function supprimerImmobilisation(id) {
  const maintenant = new Date().toISOString();
  await db.immobilisation.update(id, { deleted_at: maintenant, updated_at: maintenant });
  await db.amortissement_annuel.where('immobilisation_id').equals(id).delete();
}

// L'échéancier est entièrement dérivé de l'immobilisation (montant, durée,
// dates) — régénéré en entier à chaque création/modification plutôt que
// diffé, plus simple et sans risque d'incohérence résiduelle. Seule
// `cle_repartition` est un choix propre à chaque ligne (§6.4) : préservée
// si elle existait déjà pour cet exercice, "egale" par défaut sinon —
// aucune valeur par défaut n'étant fixée par le brief, "egale" est la clé
// la plus neutre (répartition entre toutes les ruches actives sans
// dépendre d'une production pas encore connue).
async function regenererDotations(immobilisationId) {
  const immobilisation = await db.immobilisation.get(immobilisationId);
  if (!immobilisation || immobilisation.deleted_at) return;

  const existantes = await db.amortissement_annuel.where('immobilisation_id').equals(immobilisationId).toArray();
  const cleParExercice = new Map(existantes.filter((d) => !d.deleted_at).map((d) => [d.exercice, d.cle_repartition]));

  const lignes = calculerLignesDotation({
    valeurAcquisition: immobilisation.valeur_acquisition,
    dureeAmortissementAnnees: immobilisation.duree_amortissement_annees,
    dateAcquisition: immobilisation.date_acquisition,
    dateSortie: immobilisation.date_sortie,
  });

  const maintenant = new Date().toISOString();
  await db.amortissement_annuel.where('immobilisation_id').equals(immobilisationId).delete();
  if (lignes.length > 0) {
    await db.amortissement_annuel.bulkAdd(
      lignes.map((l) => ({
        id: crypto.randomUUID(),
        immobilisation_id: immobilisationId,
        exercice: l.exercice,
        dotation: l.dotation,
        cle_repartition: cleParExercice.get(l.exercice) ?? 'egale',
        created_at: maintenant,
        updated_at: maintenant,
        deleted_at: null,
      }))
    );
  }
}

export async function modifierCleRepartitionDotation(immobilisationId, exercice, cleRepartition) {
  const ligne = await db.amortissement_annuel
    .where('immobilisation_id')
    .equals(immobilisationId)
    .and((d) => !d.deleted_at && d.exercice === exercice)
    .first();
  if (!ligne) return;
  await db.amortissement_annuel.update(ligne.id, {
    cle_repartition: cleRepartition,
    updated_at: new Date().toISOString(),
  });
}

export async function listerImmobilisations() {
  const immobilisations = await db.immobilisation.filter((i) => !i.deleted_at).toArray();
  return immobilisations.sort((a, b) => (b.date_acquisition ?? '').localeCompare(a.date_acquisition ?? ''));
}

export async function obtenirImmobilisation(id) {
  return db.immobilisation.get(id);
}

export async function listerDotations(immobilisationId) {
  const dotations = await db.amortissement_annuel
    .where('immobilisation_id')
    .equals(immobilisationId)
    .and((d) => !d.deleted_at)
    .toArray();
  return dotations.sort((a, b) => a.exercice - b.exercice);
}

// Rattache/détache une immobilisation à une ruche précise (brief §6.4,
// "une immobilisation rattachée à une ruche précise via
// ruche.immobilisation_id s'affecte directement à elle, sans clé"). Le
// champ existe déjà sur `ruche` depuis L1 (posé à null partout) — L4 en
// est le premier utilisateur réel.
export async function rattacherImmobilisationRuche(rucheId, immobilisationId) {
  return db.ruche.update(rucheId, { immobilisation_id: immobilisationId, updated_at: new Date().toISOString() });
}

export async function detacherImmobilisationRuche(rucheId) {
  return db.ruche.update(rucheId, { immobilisation_id: null, updated_at: new Date().toISOString() });
}
