import { db } from '../db.js';

// Colonies actives avec leur contexte (ruche, rucher) pour l'affichage —
// une colonie sans ruche ou sans rucher retrouvable est écartée.
export async function listerColoniesActives() {
  const colonies = await db.colonie
    .where('statut')
    .equals('active')
    .and((c) => !c.deleted_at)
    .toArray();

  const contexte = await Promise.all(
    colonies.map(async (colonie) => {
      const ruche = await db.ruche.get(colonie.ruche_id);
      const rucher = ruche ? await db.rucher.get(ruche.rucher_id) : null;
      return { colonie, ruche, rucher };
    })
  );

  return contexte.filter((c) => c.ruche && c.rucher);
}
