import { db } from '../db.js';

// L1 : un seul rucher (Dompierre-les-Ormes). On prend le premier non
// supprimé plutôt que de construire un sélecteur multi-rucher hors périmètre.
export async function obtenirPremierRucher() {
  return db.rucher.filter((r) => !r.deleted_at).first();
}

export async function mettreAJourOrdreTournee(rucherId, ordreTournee) {
  return db.rucher.update(rucherId, {
    ordre_tournee: ordreTournee,
    updated_at: new Date().toISOString(),
  });
}
