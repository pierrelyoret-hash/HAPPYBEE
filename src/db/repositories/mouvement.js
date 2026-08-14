import { db } from '../db.js';

export async function enregistrerMouvement(mouvement) {
  return db.mouvement.add(mouvement);
}

export async function listerHistoriqueMouvement(colonieId) {
  const mouvements = await db.mouvement
    .where('colonie_id')
    .equals(colonieId)
    .and((m) => !m.deleted_at)
    .toArray();
  return mouvements.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
}
