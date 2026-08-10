import { db } from '../db.js';

export async function importerEnregistrements(enregistrements) {
  let nbVisites = 0;
  let nbTaches = 0;

  await db.transaction('rw', db.visite, db.tache, async () => {
    for (const enr of enregistrements) {
      if (enr.type === 'visite') {
        await db.visite.add(enr.visite);
        nbVisites++;
        if (enr.tache) {
          await db.tache.add(enr.tache);
          nbTaches++;
        }
      } else if (enr.type === 'tache_seule') {
        await db.tache.add(enr.tache);
        nbTaches++;
      }
    }
  });

  return { nbVisites, nbTaches };
}
