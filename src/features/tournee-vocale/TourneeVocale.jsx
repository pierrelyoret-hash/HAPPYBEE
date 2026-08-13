import { useEffect, useRef, useState } from 'react';
import { BoutonRetour } from '../../components/BoutonRetour.jsx';
import { db } from '../../db/db.js';
import { obtenirPremierRucher } from '../../db/repositories/ruchers.js';
import {
  enregistrerAudio,
  enregistrerTranscription,
  listerAudioColonie,
} from '../../db/repositories/audio.js';
import { transcrire } from '../../lib/transcription.js';
import { corrigerGlossaire } from '../../lib/glossaireDictee.js';

// Un enregistrement à la fois par colonie (L2.4 "découpage par colonie") —
// recommencer écrase simplement l'ancien, pas de gestion de versions ici.
function LigneColonieVocale({ ruche, colonieId, onProgresModele }) {
  const [enCours, setEnCours] = useState(false);
  const [statut, setStatut] = useState(null); // null | 'transcription' | 'transcrit' | 'erreur'
  const [transcriptionTexte, setTranscriptionTexte] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const debutRef = useRef(null);

  useEffect(() => {
    listerAudioColonie(colonieId).then((liste) => {
      const dernier = liste[liste.length - 1];
      if (dernier?.transcription_brute) {
        setStatut('transcrit');
        setTranscriptionTexte(dernier.transcription_brute);
      }
    });
  }, [colonieId]);

  async function demarrer() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      debutRef.current = Date.now();

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const dureeSecondes = Math.round((Date.now() - debutRef.current) / 1000);
        setEnCours(false);
        setStatut('transcription');
        try {
          const audioId = await enregistrerAudio({ colonieId, blob, dureeSecondes });
          const brut = await transcrire(blob, { onProgres: onProgresModele });
          const corrige = corrigerGlossaire(brut);
          await enregistrerTranscription(audioId, corrige);
          setTranscriptionTexte(corrige);
          setStatut('transcrit');
        } catch (err) {
          console.error('[tournée vocale] échec enregistrement/transcription', err);
          setStatut('erreur');
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setEnCours(true);
      setStatut(null);
    } catch (err) {
      console.error('[tournée vocale] accès micro refusé', err);
      setStatut('erreur');
    }
  }

  function arreter() {
    mediaRecorderRef.current?.stop();
  }

  return (
    <li className="p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-13 font-bold">Ruche {ruche.numero}</span>
        <button
          type="button"
          onClick={enCours ? arreter : demarrer}
          disabled={statut === 'transcription'}
          className={`h-9 px-3 rounded text-13 font-bold shrink-0 ${
            enCours ? 'bg-urgent-ink text-surface' : 'bg-ink text-surface disabled:opacity-40'
          }`}
        >
          {enCours ? '■ Arrêter' : statut === 'transcrit' ? '● Refaire' : '● Enregistrer'}
        </button>
      </div>
      {statut === 'transcription' && (
        <p className="text-11 text-ink-muted">Transcription en cours…</p>
      )}
      {statut === 'erreur' && (
        <p className="text-11 text-urgent-ink">
          Échec — micro refusé, ou transcription impossible hors-ligne avant le premier
          téléchargement du modèle.
        </p>
      )}
      {transcriptionTexte && (
        <p className="text-12 text-ink-secondary italic">« {transcriptionTexte} »</p>
      )}
    </li>
  );
}

export function TourneeVocale({ onRetour, onOuvrirRevueTournee }) {
  const [rucher, setRucher] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [progresModele, setProgresModele] = useState(null);

  useEffect(() => {
    async function charger() {
      const r = await obtenirPremierRucher();
      if (!r) {
        setRucher(null);
        setLignes([]);
        setChargement(false);
        return;
      }
      setRucher(r);
      const ordre = r.ordre_tournee ?? [];
      const ruches = await db.ruche.bulkGet(ordre);
      const colonies = await db.colonie
        .where('ruche_id')
        .anyOf(ordre)
        .and((c) => c.statut === 'active' && !c.deleted_at)
        .toArray();
      const colonieParRuche = new Map(colonies.map((c) => [c.ruche_id, c]));
      const donnees = ordre
        .map((rucheId, index) => {
          const ruche = ruches[index];
          const colonie = colonieParRuche.get(rucheId);
          if (!ruche || !colonie) return null;
          return { ruche, colonie };
        })
        .filter(Boolean);
      setLignes(donnees);
      setChargement(false);
    }
    charger();
  }, []);

  function onProgresModele(evenement) {
    if (evenement?.status === 'progress' && evenement.total) {
      setProgresModele(Math.round((evenement.loaded / evenement.total) * 100));
    } else if (evenement?.status === 'done') {
      setProgresModele(null);
    }
  }

  if (chargement) return null;

  if (!rucher) {
    return <p className="p-4 text-13 text-ink-secondary">Aucun rucher trouvé.</p>;
  }

  return (
    <div className="min-h-screen bg-ground text-ink p-4 flex flex-col gap-4 max-w-md mx-auto">
      <header className="flex flex-col gap-1">
        <BoutonRetour onRetour={onRetour} />
        <h1 className="text-20 font-bold">Tournée vocale</h1>
        <p className="text-13 text-ink-secondary">
          Un enregistrement par colonie. La transcription se fait automatiquement — à relire et
          valider sur l'écran de revue.
        </p>
      </header>

      {progresModele != null && (
        <p className="text-12 text-ink-muted">
          Téléchargement du modèle de transcription (une seule fois) : {progresModele}%
        </p>
      )}

      <ul className="bg-surface rounded border border-rule divide-y divide-rule">
        {lignes.map(({ ruche, colonie }) => (
          <LigneColonieVocale
            key={colonie.id}
            ruche={ruche}
            colonieId={colonie.id}
            onProgresModele={onProgresModele}
          />
        ))}
      </ul>

      {onOuvrirRevueTournee && (
        <button
          type="button"
          onClick={onOuvrirRevueTournee}
          className="h-10 w-full rounded bg-surface border border-rule-strong text-ink text-15 font-bold"
        >
          Passer à la revue de tournée
        </button>
      )}

      {onRetour && (
        <button
          type="button"
          onClick={onRetour}
          className="h-12 w-full text-13 text-ink-secondary underline"
        >
          Retour à la vue d'ensemble
        </button>
      )}
    </div>
  );
}
