import { pipeline } from '@huggingface/transformers';

// Transcription embarquée (arbitrage du 12/08/2026 : gratuit, cohérent avec
// "utilisable sans réseau" et "budget ≤ 0 €/mois hors IA" — la transcription
// sort même de cette exception, elle ne coûte jamais rien). Le modèle se
// télécharge une fois puis reste en cache navigateur (Cache Storage, géré
// par la librairie elle-même) — fonctionne hors-ligne ensuite.
// whisper-small plutôt que whisper-base (arbitrage du 13/08/2026, après un
// premier test réel au rucher jugé trop imprécis) — nettement meilleur sur
// le français courant, au prix d'un téléchargement plus lourd (~1 Go en
// fp32 contre ~300 Mo) — accepté explicitement.
const MODELE = 'Xenova/whisper-small';

let transcripteurPromesse = null;

function obtenirTranscripteur(onProgres) {
  if (!transcripteurPromesse) {
    transcripteurPromesse = pipeline('automatic-speech-recognition', MODELE, {
      progress_callback: onProgres,
      // Les variantes quantifiées (q4/q8) du décodeur fusionné échouent à
      // la création de session sur le backend WASM — bug connu de
      // @huggingface/transformers 4.2.0 (issue #1707, juin 2026), constaté
      // ici le 13/08/2026 sur whisper-tiny ET whisper-small. fp32 contourne
      // le bug (confirmé par l'équipe du projet) au prix d'un modèle plus
      // lourd à télécharger — pas d'alternative fiable sur tous les
      // téléphones : le backend WebGPU qui évite aussi le bug n'est pas
      // disponible partout.
      dtype: 'fp32',
    });
  }
  return transcripteurPromesse;
}

// `blob` : l'enregistrement local (webm/opus ou équivalent selon le
// navigateur) — la pipeline décode elle-même depuis une URL, pas besoin de
// convertir le format à la main. chunk_length_s/stride_length_s : une
// tournée peut dépasser 30 s, la fenêtre de Whisper.
export async function transcrire(blob, { onProgres } = {}) {
  const transcripteur = await obtenirTranscripteur(onProgres);
  const url = URL.createObjectURL(blob);
  try {
    const resultat = await transcripteur(url, {
      language: 'french',
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5,
    });
    return resultat.text.trim();
  } finally {
    URL.revokeObjectURL(url);
  }
}
