import { db } from '../db.js';

const STATUTS_FERMES = ['faite', 'annulee'];

// Convention : une tâche liée à une colonie porte aussi le rucher_id de
// cette colonie, ce qui permet de tout récupérer en une requête indexée.
export async function listerTachesOuvertesRucher(rucherId) {
  const taches = await db.tache.where('rucher_id').equals(rucherId).toArray();
  return taches.filter((t) => !t.deleted_at && !STATUTS_FERMES.includes(t.statut));
}

export async function creerTache(tache) {
  return db.tache.add(tache);
}
