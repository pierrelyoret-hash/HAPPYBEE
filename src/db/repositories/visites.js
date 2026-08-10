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
