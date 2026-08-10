import Dexie from 'dexie';

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
