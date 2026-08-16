import { db } from '../db.js';

// Même principe que photos.js : le blob vit à part (audio_blob, jamais
// synchronisé en JSON), la ligne `audio` ne porte que des métadonnées.
// colonie_id est renseigné dès l'enregistrement (tournée vocale, avant
// qu'une visite existe) ; visite_id ne l'est qu'une fois la visite
// validée sur l'écran de revue (rattacherVisite).
// Un enregistrement actif (pas encore rattaché à une visite) à la fois par
// colonie (L2.4) : un "Refaire" doit vraiment remplacer la tentative
// précédente, pas s'y ajouter — sinon l'écran de revue peut relire une
// transcription périmée (bug constaté le 16/08/2026). Les enregistrements
// déjà rattachés à une visite validée (historique) ne sont jamais touchés.
async function supprimerAudioNonRattacheColonie(colonieId) {
  const maintenant = new Date().toISOString();
  const precedents = await db.audio
    .where('colonie_id')
    .equals(colonieId)
    .and((a) => !a.deleted_at && !a.visite_id)
    .toArray();
  for (const precedent of precedents) {
    await db.audio.update(precedent.id, { deleted_at: maintenant, updated_at: maintenant });
    await db.audio_blob.delete(precedent.id);
  }
}

export async function enregistrerAudio({ colonieId, blob, dureeSecondes = null }) {
  await supprimerAudioNonRattacheColonie(colonieId);
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

// Trié par date de création réelle, pas par id (crypto.randomUUID() n'a
// aucun ordre chronologique) — les appelants qui prennent le dernier
// élément du tableau doivent obtenir le plus récent, pas un au hasard.
export async function listerAudioColonie(colonieId) {
  const liste = await db.audio
    .where('colonie_id')
    .equals(colonieId)
    .and((a) => !a.deleted_at)
    .toArray();
  return liste.sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));
}

export async function obtenirBlobLocalAudio(audioId) {
  const ligne = await db.audio_blob.get(audioId);
  return ligne?.blob ?? null;
}

export async function supprimerAudio(audioId) {
  const maintenant = new Date().toISOString();
  await db.audio.update(audioId, { deleted_at: maintenant, updated_at: maintenant });
}
