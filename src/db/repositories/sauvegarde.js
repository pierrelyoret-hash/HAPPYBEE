import { db } from '../db.js';
import { normaliserPonteQualite } from '../../lib/migrationPonteQualite.js';

const TABLES = [
  'rucher',
  'ruche',
  'colonie',
  'reine',
  'visite',
  'tache',
  'observation_cadre',
  'photo',
  'traitement',
  'comptage_varroa',
  'nourrissement',
  'document',
  'audio',
  // L3bis (brief_L3bis_moteur_regles.md §10.13) : meteo_journaliere est
  // reconstructible depuis l'archive Open-Meteo (comme meteo_cache, absente
  // de cette liste), mais son inclusion ici sert de méthode de vérification
  // à l'ingestion elle-même (§9 étape 1, "vérification par export JSON
  // avant/après") — pas seulement une sauvegarde de confort.
  'meteo_journaliere',
  'regle',
  'recommandation',
  'observation_effet',
  // L4 (brief_L4_economique.md §5) : ecriture_affectation est dérivée (voir
  // db.js v12) et volontairement absente d'ici — elle se régénère depuis
  // ecriture + recolte, l'exporter figerait un calcul qui redeviendrait
  // faux dès la restauration sur une base dont les récoltes ont changé.
  'categorie',
  'tiers',
  'ecriture',
  'immobilisation',
  'amortissement_annuel',
];

export async function exporterDonnees() {
  const tables = {};
  for (const nom of TABLES) {
    tables[nom] = await db[nom].toArray();
  }
  return {
    // Incrémenté pour la première fois ici (16/08/2026) — jusque-là figé à 1
    // depuis l'origine du module, donc impropre à distinguer un fichier
    // antérieur à la migration Dexie v4 (ponte_qualite) d'un fichier récent.
    // Les fichiers déjà sur disque restent en version 1 : c'est pour ça que
    // restaurerDonnees ci-dessous se base sur la présence du champ
    // ponte_qualite, pas sur ce numéro.
    version: 2,
    exporte_le: new Date().toISOString(),
    tables,
  };
}

// Restauration complète : remplace intégralement chaque table par le
// contenu du fichier (pas de fusion) — cohérent avec "restauration
// complète" du brief. Transaction unique : tout ou rien.
export async function restaurerDonnees(sauvegarde) {
  if (!sauvegarde || typeof sauvegarde !== 'object' || !sauvegarde.tables) {
    throw new Error('Fichier de sauvegarde invalide.');
  }

  await db.transaction(
    'rw',
    TABLES.map((nom) => db[nom]),
    async () => {
      for (const nom of TABLES) {
        await db[nom].clear();
        const lignes = sauvegarde.tables[nom];
        if (Array.isArray(lignes) && lignes.length > 0) {
          // clear() + bulkAdd() n'est pas une migration Dexie : celles-ci ne
          // se déclenchent qu'au changement de version du schéma, jamais à
          // une insertion. Une sauvegarde antérieure à la migration v4
          // (ponte_qualite → score_ponte) réintroduirait donc le champ tel
          // quel sur une base déjà en v10+ — rejoué ici ligne par ligne,
          // par présence du champ plutôt que par le numéro de version (voir
          // exporterDonnees ci-dessus).
          if (nom === 'visite') {
            for (const visite of lignes) {
              if ('ponte_qualite' in visite) {
                normaliserPonteQualite(visite);
              }
            }
          }
          await db[nom].bulkAdd(lignes);
        }
      }
    }
  );
}

export function compterEnregistrements(donnees) {
  return Object.values(donnees.tables).reduce((total, lignes) => total + lignes.length, 0);
}
