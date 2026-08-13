import { db } from '../db.js';

// Le blob compressé est fourni par l'appelant (lib/compressionImage.js) —
// ce repository ne fait qu'écrire, jamais de logique de compression ici.
export async function enregistrerPhoto({ visiteId, observationCadreId = null, blob, legende = null }) {
  const maintenant = new Date().toISOString();
  const id = crypto.randomUUID();
  await db.photo.add({
    id,
    visite_id: visiteId,
    observation_cadre_id: observationCadreId,
    // Sert juste de repère "un blob local existe pour cette photo" — la
    // valeur elle-même (l'octet) vit dans photo_blob, jamais synchronisée
    // en tant que ligne JSON (lib/sync.js s'en charge à part).
    fichier_local: id,
    fichier_distant: null,
    legende,
    prise_le: maintenant,
    latitude: null,
    longitude: null,
    statut_sync: 'en_attente',
    created_at: maintenant,
    updated_at: maintenant,
    deleted_at: null,
  });
  await db.photo_blob.put({ photo_id: id, blob });
  return id;
}

export async function listerPhotosVisite(visiteId) {
  return db.photo
    .where('visite_id')
    .equals(visiteId)
    .and((p) => !p.deleted_at)
    .toArray();
}

export async function obtenirBlobLocal(photoId) {
  const ligne = await db.photo_blob.get(photoId);
  return ligne?.blob ?? null;
}

export async function supprimerPhoto(photoId) {
  const maintenant = new Date().toISOString();
  await db.photo.update(photoId, { deleted_at: maintenant, updated_at: maintenant });
}
