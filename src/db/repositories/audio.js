import { db } from '../db.js';

// Même principe que photos.js : le blob vit à part (audio_blob, jamais
// synchronisé en JSON), la ligne `audio` ne porte que des métadonnées.
// colonie_id est renseigné dès l'enregistrement (tournée vocale, avant
// qu'une visite existe) ; visite_id ne l'est qu'une fois la visite
// validée sur l'écran de revue (rattacherVisite).
export async function enregistrerAudio({ colonieId, blob, dureeSecondes = null }) {
  const maintenant = new Date().toISOString();
  const id = crypto.randomUUID();
  await db.audio.add({
    id,
    colonie_id: colonieId,
    visite_id: null,
    fichier_local: id,
    fichier_distant: null,
    duree_secondes: dureeSecondes,
    transcription_brute: null,
    statut_sync: 'en_attente',
    created_at: maintenant,
    updated_at: maintenant,
    deleted_at: null,
  });
  await db.audio_blob.put({ audio_id: id, blob });
  return id;
}

export async function enregistrerTranscription(audioId, texte) {
  const maintenant = new Date().toISOString();
  await db.audio.update(audioId, { transcription_brute: texte, updated_at: maintenant });
}

export async function rattacherVisite(audioId, visiteId) {
  const maintenant = new Date().toISOString();
  await db.audio.update(audioId, { visite_id: visiteId, updated_at: maintenant });
}

export async function listerAudioColonie(colonieId) {
  return db.audio
    .where('colonie_id')
    .equals(colonieId)
    .and((a) => !a.deleted_at)
    .toArray();
}

export async function obtenirBlobLocalAudio(audioId) {
  const ligne = await db.audio_blob.get(audioId);
  return ligne?.blob ?? null;
}

export async function supprimerAudio(audioId) {
  const maintenant = new Date().toISOString();
  await db.audio.update(audioId, { deleted_at: maintenant, updated_at: maintenant });
}
