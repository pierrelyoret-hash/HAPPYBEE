import { db } from '../db.js';

// Colonies actives avec leur contexte (ruche, rucher) pour l'affichage —
// une colonie sans ruche ou sans rucher retrouvable est écartée.
export async function listerColoniesActives() {
  const colonies = await db.colonie
    .where('statut')
    .equals('active')
    .and((c) => !c.deleted_at)
    .toArray();

  const ruches = await db.ruche.bulkGet(colonies.map((c) => c.ruche_id));
  const ruchers = await db.rucher.bulkGet(
    ruches.map((r) => r?.rucher_id).filter(Boolean)
  );
  const rucherParId = new Map(ruchers.filter(Boolean).map((r) => [r.id, r]));

  return colonies
    .map((colonie, i) => {
      const ruche = ruches[i];
      const rucher = ruche ? rucherParId.get(ruche.rucher_id) : null;
      return { colonie, ruche, rucher };
    })
    .filter((c) => c.ruche && c.rucher);
}
