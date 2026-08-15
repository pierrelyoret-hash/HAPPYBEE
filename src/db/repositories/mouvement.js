import { db } from '../db.js';

export async function enregistrerMouvement(mouvement) {
  return db.mouvement.add(mouvement);
}

// Les ruchers d'origine/destination d'une transhumance sont résolus ici :
// affichés tels quels dans l'historique (retour d'usage réel du
// 15/08/2026 — jusqu'ici seuls type et date apparaissaient, une
// transhumance sans destination visible n'a aucun intérêt à relire).
export async function listerHistoriqueMouvement(colonieId) {
  const mouvements = await db.mouvement
    .where('colonie_id')
    .equals(colonieId)
    .and((m) => !m.deleted_at)
    .toArray();

  const rucherIds = [
    ...new Set(mouvements.flatMap((m) => [m.rucher_origine_id, m.rucher_destination_id]).filter(Boolean)),
  ];
  const ruchers = await db.rucher.bulkGet(rucherIds);
  const rucherParId = new Map(ruchers.filter(Boolean).map((r) => [r.id, r]));

  return mouvements
    .map((m) => ({
      ...m,
      rucherOrigineNom: m.rucher_origine_id ? (rucherParId.get(m.rucher_origine_id)?.nom ?? null) : null,
      rucherDestinationNom: m.rucher_destination_id
        ? (rucherParId.get(m.rucher_destination_id)?.nom ?? null)
        : null,
    }))
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
}
