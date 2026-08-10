import Dexie from 'dexie';
import { db } from '../db.js';

export async function obtenirDerniereVisite(colonieId) {
  return db.visite
    .where('[colonie_id+date]')
    .between([colonieId, Dexie.minKey], [colonieId, Dexie.maxKey])
    .and((visite) => !visite.deleted_at)
    .last();
}

export async function enregistrerVisite(visite) {
  return db.visite.add(visite);
}

// Ordre chronologique croissant (la plus ancienne en premier) — c'est à
// l'affichage de choisir le sens de lecture.
export async function listerVisitesColonie(colonieId) {
  const visites = await db.visite
    .where('[colonie_id+date]')
    .between([colonieId, Dexie.minKey], [colonieId, Dexie.maxKey])
    .and((visite) => !visite.deleted_at)
    .toArray();
  return visites.sort((a, b) => a.date.localeCompare(b.date));
}
