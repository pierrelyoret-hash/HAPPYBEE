import Dexie from 'dexie';
import { normaliserPonteQualite } from '../lib/migrationPonteQualite.js';

export const db = new Dexie('happybee');

// Champs communs à toutes les tables (non indexés sauf mention) :
// id (uuid), created_at, updated_at, deleted_at — suppression logique uniquement.
db.version(1).stores({
  rucher: 'id, deleted_at',
  ruche: 'id, rucher_id, statut, deleted_at',
  colonie: 'id, ruche_id, statut, deleted_at',
  reine: 'id, colonie_id, deleted_at',
  visite: 'id, colonie_id, date, deleted_at',
  tache: 'id, colonie_id, rucher_id, statut, date_echeance, deleted_at',
});

// v2 : index composé pour retrouver rapidement la dernière visite d'une
// colonie (pré-remplissage différentiel de l'écran B).
db.version(2).stores({
  visite: 'id, colonie_id, date, [colonie_id+date], deleted_at',
});

// v3 (lot L1+) : ajout de observation_cadre (schéma seul, aucune interface
// avant L2) et de photo (schéma seul, aucune interface avant L2). Additive
// uniquement — aucune table ni index existant n'est modifié, les données
// déjà saisies ne sont pas affectées par cette migration. Les nouveaux
// champs de visite (score_ponte, signes_sanitaires, source_agregats,
// suspicion_reglementee) ne sont pas indexés : ils n'ont pas besoin de
// figurer dans stores().
db.version(3).stores({
  observation_cadre: 'id, visite_id, deleted_at',
  photo: 'id, visite_id, observation_cadre_id, deleted_at',
});

// v4 (correction écrans L1 §7/§9.2) : ponte_qualite et score_ponte
// décrivaient la même chose et pouvaient se contredire. ponte_qualite est
// supprimé ; score_ponte (0-5) devient l'unique champ. Migration des
// valeurs existantes : compacte→4, lacunaire→2, absente→0. "Mâles" n'est
// pas un degré de compacité : il devient l'anomalie "ponte_males" et
// score_ponte est mis à 0 (aucune ponte de reine constatée). Si
// score_ponte était déjà renseigné (saisi après le lot L1+), il est
// conservé tel quel — seul ponte_qualite est retiré. Aucune table ni
// index modifié : pas de changement dans stores().
db.version(4)
  .stores({})
  .upgrade(async (tx) => {
    await tx
      .table('visite')
      .toCollection()
      .modify((visite) => {
        normaliserPonteQualite(visite);
      });
  });

// v5 (lot L2.2, brief_L2.2_sanitaire.md §3) : quatre nouvelles tables,
// additive uniquement — aucune table ni index existant n'est modifié. Les
// champs calculés (date_fin_delai_attente, varroas_par_jour, niveau_alerte)
// ne sont pas indexés : ils se recalculent à l'écriture, jamais interrogés
// directement.
db.version(5).stores({
  traitement: 'id, colonie_id, deleted_at',
  comptage_varroa: 'id, colonie_id, date, deleted_at',
  nourrissement: 'id, colonie_id, date, deleted_at',
  document: 'id, entite_liee_type, entite_liee_id, deleted_at',
});

// v6 (reste de L2, F2.3/L2.9 — photos) : table locale uniquement, jamais
// listée dans lib/sync.js. Un Blob ne se sérialise pas en JSON : la ligne
// `photo` (métadonnées) passe par la synchronisation générique de table,
// l'octet lui-même transite à part, vers Supabase Storage, via un chemin
// dédié dans lib/sync.js. photo_id est la clé primaire — un seul blob par
// photo, jamais recréé après upload (voir purgerBlobSynchronise).
db.version(6).stores({
  photo_blob: 'photo_id',
});

// v7 (reste de L2, L2.3/L2.4/L2.8 — dictée vocale) : même schéma que
// photo/photo_blob (métadonnées synchronisées, octet local uniquement).
// Un clip par colonie visitée pendant une tournée vocale (L2.4 "découpage
// par colonie"), rattaché à la visite une fois celle-ci validée sur l'écran
// de revue (colonie_id sert de rattachement provisoire avant cette étape).
db.version(7).stores({
  audio: 'id, colonie_id, visite_id, deleted_at',
  audio_blob: 'audio_id',
});

// v8 (lot L3, cahier des charges §4.2/M4/M7) : deux nouvelles tables,
// additive uniquement. `recolte` indexée par colonie_id+date pour le
// tableau de rendement (F4.4, regroupement par saison). `mouvement`
// indexée par ruche_id et colonie_id : les deux sens de recherche sont
// utiles (historique d'une ruche physique vs. d'une colonie qui a pu
// changer de ruche).
db.version(8).stores({
  recolte: 'id, colonie_id, date, deleted_at',
  mouvement: 'id, ruche_id, colonie_id, date, deleted_at',
});

// v9 (retour d'usage réel du 14/08/2026) : l'occupation des faces de cadre
// passe de huitièmes (0-8) à des pourcentages (0-100) — plus lisible sur le
// terrain qu'une réglette à neuf crans. Aucune table ni index modifié :
// conversion des valeurs existantes uniquement (× 12,5, arrondi).
const CHAMPS_OCCUPATION_V9 = [
  'couvain_opercule',
  'couvain_ouvert',
  'oeufs',
  'miel_opercule',
  'nectar_frais',
  'pollen',
  'cellules_vides',
  'non_bati',
  'couvain_male',
];
db.version(9)
  .stores({})
  .upgrade(async (tx) => {
    await tx
      .table('observation_cadre')
      .toCollection()
      .modify((observation) => {
        for (const champ of CHAMPS_OCCUPATION_V9) {
          if (typeof observation[champ] === 'number') {
            observation[champ] = Math.round(observation[champ] * 12.5);
          }
        }
      });
  });

// v10 (M8, F8.2) : cache local de la dernière prévision météo par rucher —
// une seule ligne par rucher (clé = rucher_id), jamais un historique. Table
// locale uniquement, jamais listée dans lib/sync.js : une prévision se
// re-télécharge sur chaque appareil, elle n'a pas besoin de synchroniser.
db.version(10).stores({
  meteo_cache: 'rucher_id',
});

// v11 (lot L3bis, brief_L3bis_moteur_regles.md §5) : quatre nouvelles
// tables, additive uniquement.
//
// meteo_journaliere — relevé observé (jamais une prévision) par rucher et
// par jour, base des agrégats du moteur (canicule, sécheresse...). Clé
// primaire composite [rucher_id+date] : au plus une ligne par jour et par
// rucher, écriture par upsert (put), pas d'id séparé. Locale uniquement,
// jamais listée dans lib/sync.js — même logique que meteo_cache (§5 du
// brief) : reconstructible à tout moment depuis l'API d'archive
// Open-Meteo, la synchroniser gonflerait le volume sans bénéfice.
//
// regle — catalogue des règles du moteur, `code` unique (ex. "R-CLIM-01"),
// versionné (`version`) pour que la traçabilité d'une recommandation
// survive à une évolution ultérieure de la règle qui l'a produite.
//
// recommandation — une proposition du moteur, jamais une tâche tant
// qu'elle n'est pas validée (cycle de vie proposee/validee/differee/
// rejetee/ignoree, §2.1 du brief — ce régime ne concerne QUE les règles du
// moteur, les 14 règles à seuil fixe déjà livrées continuent de créer
// leurs tâches directement, sans passer par ici).
//
// observation_effet — effet constaté d'une recommandation validée, à la
// visite suivante (L3b.11, priorité secondaire).
db.version(11).stores({
  meteo_journaliere: '[rucher_id+date]',
  regle: 'id, &code, deleted_at',
  recommandation: 'id, colonie_id, rucher_id, statut, regle_code, date_emission, deleted_at',
  observation_effet: 'id, recommandation_id, visite_id, deleted_at',
});

// v12 (lot L4 économique, brief_L4_economique.md §5) : six nouvelles tables,
// additive uniquement — aucune table ni index existant n'est modifié.
//
// categorie / tiers — référentiels pré-remplis au premier lancement
// (initialiserCategoriesParDefaut, src/db/repositories/economie.js),
// modifiables ensuite comme toute donnée de l'application.
//
// ecriture — une dépense ou un produit (§4.3 du cahier des charges). Index
// composé [exercice+cle_repartition] : c'est la clé d'accès du moteur de
// recalcul (§6.2) — retrouver, pour un exercice donné, toutes les écritures
// en clé "prorata_production" à recalculer quand une récolte change.
//
// ecriture_affectation — dérivée, jamais saisie : une ligne par ruche
// concernée, régénérée entièrement à chaque recalcul (§6.2). Locale
// uniquement, jamais listée dans lib/sync.js — même logique que
// meteo_journaliere (v11) : recalculable à tout moment depuis `ecriture` et
// `recolte` (déjà synchronisées), la synchroniser gonflerait le volume sans
// bénéfice et risquerait un dernier-écrit-gagne incohérent avec la donnée
// source qui l'a produite. Clé primaire composite [ecriture_id+ruche_id] :
// au plus une ligne par ruche et par écriture, écriture par upsert (put),
// pas d'id séparé — même idiome que meteo_journaliere.
//
// immobilisation / amortissement_annuel — §6.4. amortissement_annuel est
// "généré" (§4.3) mais sa clé de répartition reste un choix par exercice
// (§6.4 du brief : la dotation "se répartit... selon
// amortissement_annuel.cle_repartition"), donc une vraie table
// synchronisée, pas une dérivation pure comme ecriture_affectation.
//
// document_blob — même mécanique que photo_blob/audio_blob (v6/v7) :
// `document` existe en schéma depuis v5 (L2.2) mais n'a jamais eu de
// premier utilisateur réel (grep "db.document" négatif dans tout le code
// avant ce lot) ; L4 (justificatif photographié, F6.4) en est le premier.
// L'octet transite par Supabase Storage (bucket "documents", à créer côté
// infrastructure — hors du périmètre code de ce lot), jamais en JSON.
db.version(12).stores({
  categorie: 'id, sens, deleted_at',
  tiers: 'id, type, deleted_at',
  ecriture:
    'id, date, exercice, sens, categorie_id, tiers_id, rucher_id, cle_repartition, [exercice+cle_repartition], deleted_at',
  ecriture_affectation: '[ecriture_id+ruche_id], ruche_id',
  immobilisation: 'id, deleted_at',
  amortissement_annuel: 'id, immobilisation_id, exercice, deleted_at',
  document_blob: 'document_id',
});
