import { db } from '../db/db.js';
import { obtenirSaison } from './saison.js';

// Bornes de l'exercice = campagne apicole avril-mars (arbitrage 18/08/2026,
// cadrage_ux_L4_economique.md §6.2 : "l'outil existe déjà, ne pas en écrire
// un second" — src/lib/saison.js définit obtenirSaison(dateIso) → exercice,
// mais pas l'inverse (exercice → bornes de dates), qui manque ici pour
// borner les requêtes recolte/ecriture par date. Même règle, sens inverse.
export function bornesExercice(exercice) {
  return { debut: `${exercice}-04-01`, fin: `${exercice + 1}-03-31` };
}

function arrondiCentime(montant) {
  return Math.round(montant * 100) / 100;
}

// §6.1 du brief : "ruches actives sur la période" = statut actif à un
// moment quelconque de l'exercice — une ruche réformée EN COURS d'exercice
// compte. `ruche.date_reforme` (ajouté dans src/db/repositories/ruches.js
// pour ce lot) permet de le vérifier ; les ruches réformées avant l'ajout
// de ce champ n'en ont pas — on les compte par prudence plutôt que de les
// exclure à tort (l'inverse casserait silencieusement des exercices déjà
// clos sur des données réelles).
export function estActiveSurExercice(ruche, exercice) {
  const { fin } = bornesExercice(exercice);
  if (ruche.date_acquisition && ruche.date_acquisition > fin) return false;
  if (ruche.statut !== 'reformee') return true;
  if (!ruche.date_reforme) return true;
  const { debut } = bornesExercice(exercice);
  return ruche.date_reforme >= debut;
}

// kg de miel produits par ruche sur l'exercice (§6.3 du brief) : remonte
// colonie.ruche_id, somme TOUTES les colonies ayant occupé la ruche (pas
// seulement la colonie actuelle) — une ruche réformée-repeuplée dans le
// même exercice cumule la production des deux. Uniquement `produit ===
// 'miel'` : c'est "le coût de revient au kilo de MIEL" (§1 du brief), la
// cire/propolis/pollen/essaims ne doivent pas diluer ce ratio.
export async function obtenirKgMielParRuche(rucheIds, exercice) {
  if (rucheIds.length === 0) return {};
  const { debut, fin } = bornesExercice(exercice);
  const colonies = await db.colonie.filter((c) => !c.deleted_at && rucheIds.includes(c.ruche_id)).toArray();
  const rucheParColonieId = new Map(colonies.map((c) => [c.id, c.ruche_id]));
  const colonieIds = colonies.map((c) => c.id);
  if (colonieIds.length === 0) return {};

  const recoltes = await db.recolte
    .filter(
      (r) =>
        !r.deleted_at &&
        r.produit === 'miel' &&
        r.poids_net != null &&
        colonieIds.includes(r.colonie_id) &&
        r.date >= debut &&
        r.date <= fin
    )
    .toArray();

  const kgParRuche = {};
  for (const r of recoltes) {
    const rucheId = rucheParColonieId.get(r.colonie_id);
    if (!rucheId) continue;
    kgParRuche[rucheId] = (kgParRuche[rucheId] ?? 0) + r.poids_net;
  }
  return kgParRuche;
}

// §6.1/§6.2, formules reprises à l'identique du cahier des charges. Fonction
// pure : ne touche pas la base, appelée à la fois par le recalcul d'une
// écriture et par celui d'une dotation d'amortissement (même quatre clés,
// brief §6.4).
//
// Division par zéro (§6.1) : sélection vide, ou kg_total_sélection nul en
// clé "prorata_production" → aucune ligne renvoyée. L'appelant doit alors
// ne rien écrire dans ecriture_affectation plutôt que d'y mettre 0 ou NaN —
// "l'écriture reste au niveau supérieur, signalée comme non affectée."
export function calculerMontants(cleRepartition, montant, rucheIds, { kgParRuche = {}, pourcentagesManuels = {} } = {}) {
  if (rucheIds.length === 0) return [];

  switch (cleRepartition) {
    case 'egale':
    case 'prorata_nb_ruches': {
      // Même formule pour les deux clés (montant / nombre de ruches) : la
      // différence entre elles se joue en amont, sur QUELLE population de
      // ruches on applique cette division (voir determinerPerimetre
      // ci-dessous) — "prorata_nb_ruches" restreint aux ruches actives sur
      // la période, "egale" prend la sélection telle quelle.
      const part = montant / rucheIds.length;
      const pct = 100 / rucheIds.length;
      return rucheIds.map((rucheId) => ({
        ruche_id: rucheId,
        quote_part_pct: pct,
        montant_calcule: arrondiCentime(part),
      }));
    }
    case 'prorata_production': {
      const kgTotal = rucheIds.reduce((somme, id) => somme + (kgParRuche[id] ?? 0), 0);
      if (kgTotal === 0) return [];
      return rucheIds.map((rucheId) => {
        const kg = kgParRuche[rucheId] ?? 0;
        return {
          ruche_id: rucheId,
          quote_part_pct: (kg / kgTotal) * 100,
          montant_calcule: arrondiCentime(montant * (kg / kgTotal)),
        };
      });
    }
    case 'manuelle': {
      // Pas de contrôle de somme ici (§6.1 : "jamais bloquante", aucun
      // champ n'est obligatoire nulle part dans l'application) — le moteur
      // applique les pourcentages tels que saisis, l'écran affiche l'écart.
      return rucheIds.map((rucheId) => {
        const pct = Number(pourcentagesManuels[rucheId]) || 0;
        return {
          ruche_id: rucheId,
          quote_part_pct: pct,
          montant_calcule: arrondiCentime(montant * (pct / 100)),
        };
      });
    }
    default:
      return [];
  }
}

// Périmètre de ruches concerné par un montant à répartir (une écriture ou
// une dotation d'amortissement), avant application de la clé.
// - niveau "exploitation" : toutes les ruches non supprimées.
// - niveau "rucher" : les ruches du rucher désigné.
// - niveau "ruches" (sélection libre) : voir determinerRuchesConcernees
//   ci-dessous — cette fonction-ci ne gère que les deux premiers cas,
//   génériques aussi pour une immobilisation non rattachée à une ruche
//   précise (brief §6.4 : traitée comme "exploitation" par défaut, faute de
//   niveau_affectation propre sur `immobilisation`).
async function ruchesDuPerimetre(niveauAffectation, rucherId) {
  if (niveauAffectation === 'rucher') {
    return (
      await db.ruche
        .where('rucher_id')
        .equals(rucherId)
        .and((r) => !r.deleted_at)
        .toArray()
    ).map((r) => r.id);
  }
  return (await db.ruche.filter((r) => !r.deleted_at).toArray()).map((r) => r.id);
}

// Calcule la répartition d'un montant sur un périmètre exploitation/rucher,
// en appliquant la clé (y compris le filtre "actives sur la période" pour
// prorata_nb_ruches, et le calcul kg pour prorata_production). Partagée par
// recalculerEcriture et la génération des dotations d'amortissement
// (src/db/repositories/immobilisations.js).
export async function calculerRepartitionSurPerimetre({ montant, cleRepartition, exercice, niveauAffectation, rucherId, pourcentagesManuels }) {
  const population = await filtrerActivesSiProrataNbRuches(
    await ruchesDuPerimetre(niveauAffectation, rucherId),
    cleRepartition,
    exercice
  );
  const kgParRuche = cleRepartition === 'prorata_production' ? await obtenirKgMielParRuche(population, exercice) : {};
  return calculerMontants(cleRepartition, montant, population, { kgParRuche, pourcentagesManuels });
}

// Filtre "actives sur la période" (§6.1), appliqué uniquement pour la clé
// prorata_nb_ruches — partagé par calculerRepartitionSurPerimetre (dotations)
// et recalculerEcriture (écritures), pour ne pas dupliquer cette règle
// entre les deux moteurs de recalcul.
async function filtrerActivesSiProrataNbRuches(rucheIds, cleRepartition, exercice) {
  if (cleRepartition !== 'prorata_nb_ruches') return rucheIds;
  const ruches = await db.ruche.bulkGet(rucheIds);
  return ruches.filter((r) => r && estActiveSurExercice(r, exercice)).map((r) => r.id);
}

// Ruches concernées par une écriture, tous niveaux d'affectation confondus.
// Cas "ruches" (sélection libre) : le modèle du brief (§4.3/§5) ne prévoit
// aucun champ pour stocker cette sélection séparément de
// `ecriture_affectation` elle-même ("une ligne par ruche concernée") — donc
// la sélection EST le jeu de lignes déjà présentes pour cette écriture. À
// la création, l'écran d'affectation doit fournir `rucheIdsSelection`
// explicitement (aucune ligne n'existe encore) ; au recalcul, on relit les
// ruche_id déjà enregistrés, jamais re-dérivés. Signalé à BASE le
// 19/08/2026 comme lecture du modèle à confirmer par 1-SPEC.
async function determinerRuchesConcernees(ecriture, rucheIdsSelection) {
  if (ecriture.niveau_affectation !== 'ruches') {
    return ruchesDuPerimetre(ecriture.niveau_affectation, ecriture.rucher_id);
  }
  if (rucheIdsSelection) return rucheIdsSelection;
  const existantes = await db.ecriture_affectation.where('ruche_id').anyOf(await toutesLesRuchesId()).toArray();
  return existantes.filter((a) => a.ecriture_id === ecriture.id).map((a) => a.ruche_id);
}

async function toutesLesRuchesId() {
  return (await db.ruche.toArray()).map((r) => r.id);
}

// Recalcule et réécrit l'affectation d'une écriture (§6.2 du brief). Appelée
// à la création, à toute modification touchant montant/niveau/clé/
// affectation, et en lot par recalculerEcrituresProrataExercice quand une
// récolte change. `rucheIdsSelection`/`pourcentagesManuels` ne sont fournis
// que par l'écran de saisie/affectation (niveau "ruches" à la création, ou
// clé "manuelle" à tout moment) ; sinon relus depuis les lignes existantes.
export async function recalculerEcriture(ecriture, { rucheIdsSelection = null, pourcentagesManuels = null } = {}) {
  const maintenant = new Date().toISOString();
  const rucheIds = await filtrerActivesSiProrataNbRuches(
    await determinerRuchesConcernees(ecriture, rucheIdsSelection),
    ecriture.cle_repartition,
    ecriture.exercice
  );

  let pourcentages = {};
  if (ecriture.cle_repartition === 'manuelle') {
    if (pourcentagesManuels) {
      pourcentages = pourcentagesManuels;
    } else {
      const existantes = (await db.ecriture_affectation.where('ruche_id').anyOf(rucheIds).toArray()).filter(
        (a) => a.ecriture_id === ecriture.id
      );
      pourcentages = Object.fromEntries(existantes.map((a) => [a.ruche_id, a.quote_part_pct]));
    }
  }

  const kgParRuche =
    ecriture.cle_repartition === 'prorata_production' ? await obtenirKgMielParRuche(rucheIds, ecriture.exercice) : {};

  const lignes = calculerMontants(ecriture.cle_repartition, ecriture.montant, rucheIds, {
    kgParRuche,
    pourcentagesManuels: pourcentages,
  });

  await db.ecriture_affectation.where('ecriture_id').equals(ecriture.id).delete();
  if (lignes.length > 0) {
    await db.ecriture_affectation.bulkPut(
      lignes.map((l) => ({ ecriture_id: ecriture.id, ...l, calcule_le: maintenant }))
    );
  }
  return lignes;
}

// §6.2, déclencheur "toute récolte enregistrée, modifiée ou supprimée" :
// recalcule TOUTES les écritures de l'exercice en clé prorata_production
// (une récolte tardive change la répartition de toutes les charges de la
// campagne, pas seulement la dernière écriture créée). Appelée depuis
// src/db/repositories/recolte.js, jamais depuis un écran — non-régression
// du lot (brief §8 étape 9, "aucun écran existant modifié").
export async function recalculerEcrituresProrataExercice(exercice) {
  const ecritures = await db.ecriture
    .where('[exercice+cle_repartition]')
    .equals([exercice, 'prorata_production'])
    .and((e) => !e.deleted_at)
    .toArray();
  for (const ecriture of ecritures) {
    await recalculerEcriture(ecriture);
  }
}

// --- Indicateurs (§6.3, §6.5 du brief) ---

async function affectationsRuche(rucheId, exercice) {
  const { debut, fin } = bornesExercice(exercice);
  const affectations = await db.ecriture_affectation.where('ruche_id').equals(rucheId).toArray();
  if (affectations.length === 0) return [];
  const ecritureIds = [...new Set(affectations.map((a) => a.ecriture_id))];
  const ecritures = await db.ecriture.bulkGet(ecritureIds);
  const ecritureParId = new Map(ecritures.filter(Boolean).map((e) => [e.id, e]));
  return affectations
    .map((a) => ({ ...a, ecriture: ecritureParId.get(a.ecriture_id) }))
    .filter((a) => a.ecriture && !a.ecriture.deleted_at && a.ecriture.date >= debut && a.ecriture.date <= fin);
}

// Contrairement aux écritures, l'affectation d'une dotation n'est jamais
// persistée : elle est recalculée à chaque lecture (calcul pur, peu
// coûteux — au plus quelques immobilisations). Ça évite de dupliquer le
// mécanisme de recalcul événementiel d'ecriture_affectation pour une
// donnée qui n'a pas besoin d'être tracée dans le temps (pas de
// `calcule_le` à afficher : un calcul toujours à jour n'a jamais de
// fraîcheur à signaler).
async function dotationsAffecteesRuche(rucheId, exercice) {
  const ruche = await db.ruche.get(rucheId);
  let total = 0;

  // Lien direct (ruche.immobilisation_id) : 100 % à cette ruche, sans clé
  // (brief §6.4).
  if (ruche?.immobilisation_id) {
    const dotations = await db.amortissement_annuel
      .where('immobilisation_id')
      .equals(ruche.immobilisation_id)
      .and((d) => !d.deleted_at && d.exercice === exercice)
      .toArray();
    total += dotations.reduce((s, d) => s + d.dotation, 0);
  }

  // Immobilisations non rattachées à une ruche précise : réparties comme
  // une écriture au niveau "exploitation" (§6.4, faute de niveau_affectation
  // propre sur `immobilisation`), selon leur propre cle_repartition.
  const dotationsIndirectes = await db.amortissement_annuel
    .where('exercice')
    .equals(exercice)
    .and((d) => !d.deleted_at)
    .toArray();
  for (const dotation of dotationsIndirectes) {
    const immobilisation = await db.immobilisation.get(dotation.immobilisation_id);
    if (!immobilisation) continue;
    const rucheLiee = await db.ruche.filter((r) => !r.deleted_at && r.immobilisation_id === immobilisation.id).first();
    if (rucheLiee) continue; // déjà comptée ci-dessus via le lien direct
    const lignes = await calculerRepartitionSurPerimetre({
      montant: dotation.dotation,
      cleRepartition: dotation.cle_repartition,
      exercice,
      niveauAffectation: 'exploitation',
    });
    const ligne = lignes.find((l) => l.ruche_id === rucheId);
    if (ligne) total += ligne.montant_calcule;
  }

  return total;
}

export async function chargesTotalesRuche(rucheId, exercice) {
  const affectations = await affectationsRuche(rucheId, exercice);
  const chargesEcritures = affectations
    .filter((a) => ['charge_directe', 'charge_indirecte'].includes(a.ecriture.nature))
    .reduce((s, a) => s + a.montant_calcule, 0);
  return chargesEcritures + (await dotationsAffecteesRuche(rucheId, exercice));
}

export async function produitsAffectesRuche(rucheId, exercice) {
  const affectations = await affectationsRuche(rucheId, exercice);
  return affectations.filter((a) => a.ecriture.nature === 'produit').reduce((s, a) => s + a.montant_calcule, 0);
}

// §6.3 : jamais un ratio infini ni zéro sur production nulle — l'appelant
// (écran tableau de bord) affiche "non calculable — aucune production".
export async function coutDeRevientKgRuche(rucheId, exercice) {
  const charges = await chargesTotalesRuche(rucheId, exercice);
  const kg = (await obtenirKgMielParRuche([rucheId], exercice))[rucheId] ?? 0;
  if (kg === 0) return { calculable: false, charges, kg: 0 };
  return { calculable: true, valeur: charges / kg, charges, kg };
}

export async function margeRuche(rucheId, exercice) {
  const charges = await chargesTotalesRuche(rucheId, exercice);
  const produits = await produitsAffectesRuche(rucheId, exercice);
  return produits - charges;
}

// Résultat de l'exploitation sur l'exercice — somme brute des écritures
// (produit − dépense), PAS la somme des affectations par ruche : une
// écriture non affectée (division par zéro §6.1) doit quand même compter
// ici, sinon le résultat sous-évalue silencieusement les charges réelles.
export async function resultatExercice(exercice) {
  const ecritures = await db.ecriture.where('exercice').equals(exercice).and((e) => !e.deleted_at).toArray();
  const dotations = await db.amortissement_annuel.where('exercice').equals(exercice).and((d) => !d.deleted_at).toArray();
  const produits = ecritures.filter((e) => e.sens === 'produit').reduce((s, e) => s + e.montant, 0);
  const depenses = ecritures
    .filter((e) => e.sens === 'depense' && e.nature !== 'investissement_amortissable')
    .reduce((s, e) => s + e.montant, 0);
  const totalDotations = dotations.reduce((s, d) => s + d.dotation, 0);
  return produits - depenses - totalDotations;
}

// §6.5 : si le résultat de l'exercice est nul ou négatif, la contribution
// en % n'a aucun sens (une ruche rentable afficherait un pourcentage
// négatif) — l'écran n'affiche alors que la marge en euros.
export async function contributionRuche(rucheId, exercice) {
  const marge = await margeRuche(rucheId, exercice);
  const resultat = await resultatExercice(exercice);
  if (resultat <= 0) return { calculable: false, marge };
  return { calculable: true, valeur: (marge / resultat) * 100, marge };
}

// Seuil de rentabilité (§6.5) : niveau exploitation uniquement, pas par
// ruche ("un ratio isolé sur trois colonies n'a pas de valeur statistique").
export async function seuilRentabiliteExploitation(exercice) {
  const { debut, fin } = bornesExercice(exercice);
  const ecritures = await db.ecriture.where('exercice').equals(exercice).and((e) => !e.deleted_at).toArray();
  const dotations = await db.amortissement_annuel.where('exercice').equals(exercice).and((d) => !d.deleted_at).toArray();
  const chargesTotales =
    ecritures
      .filter((e) => ['charge_directe', 'charge_indirecte'].includes(e.nature))
      .reduce((s, e) => s + e.montant, 0) + dotations.reduce((s, d) => s + d.dotation, 0);

  const toutesLesRuches = (await db.ruche.filter((r) => !r.deleted_at).toArray()).map((r) => r.id);
  const kgParRuche = await obtenirKgMielParRuche(toutesLesRuches, exercice);
  const kgProduitsTotal = Object.values(kgParRuche).reduce((s, kg) => s + kg, 0);

  if (kgProduitsTotal === 0) {
    return { calculable: false, chargesTotales };
  }
  const prixDeVenteMinimumAuKg = chargesTotales / kgProduitsTotal;

  const categoriesVenteMiel = await db.categorie.filter((c) => !c.deleted_at && c.groupe === 'vente_miel').toArray();
  const categorieIds = categoriesVenteMiel.map((c) => c.id);
  const produitsVenteMiel = ecritures
    .filter((e) => categorieIds.includes(e.categorie_id) && e.date >= debut && e.date <= fin)
    .reduce((s, e) => s + e.montant, 0);

  let kgAVendrePourEquilibrer = null;
  if (produitsVenteMiel > 0) {
    const prixMoyenDeVenteAuKg = produitsVenteMiel / kgProduitsTotal;
    kgAVendrePourEquilibrer = chargesTotales / prixMoyenDeVenteAuKg;
  }

  return {
    calculable: true,
    chargesTotales,
    kgProduitsTotal,
    prixDeVenteMinimumAuKg,
    kgAVendrePourEquilibrer,
  };
}

// Tableau de bord (F6.6) : indicateurs de chaque ruche pour un exercice.
// Complexité en O(ruches × immobilisations) — sans conséquence à l'échelle
// actuelle (3-30 colonies) ni même à l'échelle cible de 200 ruches/5
// ruchers (happybee_scope_arbitrages.md) pour un nombre d'immobilisations
// qui reste faible (quelques dizaines tout au plus) ; à revisiter seulement
// si un usage réel montre un ralentissement perceptible.
export async function tableauDeBordExercice(exercice) {
  const ruches = await db.ruche.filter((r) => !r.deleted_at).toArray();
  const resultat = await resultatExercice(exercice);
  const lignes = [];
  for (const ruche of ruches) {
    const charges = await chargesTotalesRuche(ruche.id, exercice);
    const produits = await produitsAffectesRuche(ruche.id, exercice);
    const kg = (await obtenirKgMielParRuche([ruche.id], exercice))[ruche.id] ?? 0;
    const marge = produits - charges;
    lignes.push({
      rucheId: ruche.id,
      rucheNumero: ruche.numero,
      charges,
      produits,
      marge,
      coutDeRevient: kg === 0 ? { calculable: false, charges } : { calculable: true, valeur: charges / kg, charges, kg },
      contribution: resultat <= 0 ? { calculable: false, marge } : { calculable: true, valeur: (marge / resultat) * 100, marge },
    });
  }
  return { lignes: lignes.sort((a, b) => a.rucheNumero - b.rucheNumero), resultat };
}

// L5.10, priorité S — brief §7 : "à rattacher à la fiche colonie existante
// plutôt qu'à un écran neuf." Aucune formule fournie par le brief (seule
// mention, sans détail de calcul) : lecture retenue ci-dessous, à confirmer
// par 1-SPEC si besoin.
//
// Limite assumée et documentée : le moteur de répartition raisonne au
// niveau RUCHE (§6.1-6.2), jamais colonie — une ruche peut héberger
// plusieurs colonies successives (§6.3). Le "coût cumulé" d'une colonie est
// donc ici la somme des charges de SA RUCHE sur les exercices couvrant sa
// période d'occupation, pas un coût exclusif à cette colonie seule : si une
// autre colonie a occupé la même ruche sur un exercice chevauchant, ses
// charges à elle y figurent aussi. Une répartition day-by-day entre
// colonies successives au sein d'un même exercice n'est pas spécifiée par
// le brief et ajouterait une précision que les données ne permettent pas
// de garantir (les écritures n'ont pas de granularité journalière par
// colonie) — préférée à une fausse précision, dans le même esprit que
// "non calculable" plutôt qu'un chiffre inventé (§6.3).
export async function coutCumuleColoniePerdue(colonieId) {
  const colonie = await db.colonie.get(colonieId);
  if (!colonie || !colonie.date_fin) return null;

  const exerciceDebut = obtenirSaison(colonie.date_debut)?.debut;
  const exerciceFin = obtenirSaison(colonie.date_fin)?.debut;
  if (exerciceDebut == null || exerciceFin == null) return null;

  const parExercice = [];
  let total = 0;
  for (let exercice = exerciceDebut; exercice <= exerciceFin; exercice++) {
    const charges = await chargesTotalesRuche(colonie.ruche_id, exercice);
    parExercice.push({ exercice, charges });
    total += charges;
  }
  return { total, parExercice, rucheId: colonie.ruche_id };
}
