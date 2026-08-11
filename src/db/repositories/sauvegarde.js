import { db } from '../db.js';

const TABLES = ['rucher', 'ruche', 'colonie', 'reine', 'visite', 'tache', 'observation_cadre', 'photo'];

export async function exporterDonnees() {
  const tables = {};
  for (const nom of TABLES) {
    tables[nom] = await db[nom].toArray();
  }
  return {
    version: 1,
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
          await db[nom].bulkAdd(lignes);
        }
      }
    }
  );
}

export function compterEnregistrements(donnees) {
  return Object.values(donnees.tables).reduce((total, lignes) => total + lignes.length, 0);
}
