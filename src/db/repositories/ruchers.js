import { db } from '../db.js';

// F1.3 — un rucher archivé (deleted_at) sort de la liste ; ses données
// restent en base (soft delete, même convention que tout le reste de
// l'application).
export async function listerRuchers() {
  const ruchers = await db.rucher.filter((r) => !r.deleted_at).toArray();
  return ruchers.sort((a, b) => (a.nom ?? '').localeCompare(b.nom ?? ''));
}

export async function obtenirRucher(rucherId) {
  return db.rucher.get(rucherId);
}

export async function creerRucher(rucher) {
  return db.rucher.add(rucher);
}

export async function modifierRucher(rucherId, champs) {
  return db.rucher.update(rucherId, { ...champs, updated_at: new Date().toISOString() });
}

// F1.1 "archiver" — jamais de suppression définitive. Les ruches et
// colonies qu'il contenait restent en base, simplement plus atteignables
// depuis l'écran d'accueil (qui ne liste que les ruchers non archivés).
export async function archiverRucher(rucherId) {
  return db.rucher.update(rucherId, {
    deleted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

export async function mettreAJourOrdreTournee(rucherId, ordreTournee) {
  return db.rucher.update(rucherId, {
    ordre_tournee: ordreTournee,
    updated_at: new Date().toISOString(),
  });
}

// Extension F2.4 (15/08/2026) : la station Netatmo personnelle n'est
// physiquement qu'à un seul endroit — un seul rucher peut être marqué à la
// fois. Cocher la case sur un rucher décoche donc implicitement les autres.
export async function retirerStationMeteoAutresRuchers(rucherIdConserve) {
  const maintenant = new Date().toISOString();
  const autres = await db.rucher
    .filter((r) => r.id !== rucherIdConserve && r.station_meteo_ici)
    .toArray();
  await Promise.all(
    autres.map((r) => db.rucher.update(r.id, { station_meteo_ici: false, updated_at: maintenant }))
  );
}
