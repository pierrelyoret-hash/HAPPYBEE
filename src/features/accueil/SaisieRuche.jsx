import { useEffect, useState } from 'react';
import { Segmente } from '../../components/Segmente.jsx';
import { BoutonRetour } from '../../components/BoutonRetour.jsx';
import { listerRuchesRucher, creerRucheAvecColonie } from '../../db/repositories/ruches.js';

const TYPE_OPTIONS = [
  { value: 'Dadant 10c', label: 'Dadant 10c' },
  { value: 'Dadant 12c', label: 'Dadant 12c' },
  { value: 'Warré', label: 'Warré' },
  { value: 'Langstroth', label: 'Langstroth' },
  { value: 'ruchette', label: 'Ruchette' },
  { value: 'autre', label: 'Autre' },
];

const ORIGINE_COLONIE_OPTIONS = [
  { value: 'essaim_recupere', label: 'Essaim récupéré' },
  { value: 'division', label: 'Division' },
  { value: 'achat', label: 'Achat' },
  { value: 'essaim_primaire', label: 'Essaim primaire' },
];

const CHAMP_CLASSE =
  'w-full h-11 text-15 border border-rule-strong rounded px-2 bg-surface text-ink';

function dateDuJour() {
  return new Date().toISOString().slice(0, 10);
}

// F1.1 (création) — une ruche neuve entre toujours avec sa colonie initiale
// (creerRucheAvecColonie). Pas d'écran de modification pour l'instant :
// l'archivage se fait depuis le mode réordonnancement de la tournée.
export function SaisieRuche({ rucherId, onRetour, onEnregistre }) {
  const [numero, setNumero] = useState('');
  const [type, setType] = useState(null);
  const [dateAcquisition, setDateAcquisition] = useState(dateDuJour());
  const [origineRuche, setOrigineRuche] = useState('');
  const [origineColonie, setOrigineColonie] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!rucherId) return;
    listerRuchesRucher(rucherId).then((ruches) => {
      const maxNumero = ruches.reduce((max, r) => Math.max(max, r.numero ?? 0), 0);
      setNumero(String(maxNumero + 1));
    });
  }, [rucherId]);

  async function enregistrer() {
    if (!rucherId || numero === '') return;
    try {
      await creerRucheAvecColonie({
        rucherId,
        numero: Number(numero),
        type,
        dateAcquisition,
        origineRuche,
        origineColonie,
      });
      setMessage('Ruche créée.');
      onEnregistre?.(rucherId);
    } catch (err) {
      console.error('[ruche] échec création', err);
      setMessage("Erreur : la ruche n'a pas pu être créée.");
    }
  }

  return (
    <div className="min-h-screen bg-ground text-ink p-4 flex flex-col gap-4 max-w-md mx-auto">
      <header className="flex flex-col gap-1">
        <BoutonRetour onRetour={onRetour} />
        <h1 className="text-20 font-bold">Nouvelle ruche</h1>
      </header>

      <section className="flex flex-col gap-3">
        <div>
          <label className="text-13 text-ink-secondary mb-1 block" htmlFor="numero">
            Numéro
          </label>
          <input
            id="numero"
            type="number"
            className={CHAMP_CLASSE}
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
          />
        </div>

        <div>
          <p className="text-13 text-ink-secondary mb-1">Type</p>
          <Segmente options={TYPE_OPTIONS} value={type} onChange={setType} />
        </div>

        <div>
          <label className="text-13 text-ink-secondary mb-1 block" htmlFor="date_acquisition">
            Date d'acquisition
          </label>
          <input
            id="date_acquisition"
            type="date"
            className={CHAMP_CLASSE}
            value={dateAcquisition}
            onChange={(e) => setDateAcquisition(e.target.value)}
          />
        </div>

        <div>
          <label className="text-13 text-ink-secondary mb-1 block" htmlFor="origine_ruche">
            Origine de la ruche
          </label>
          <input
            id="origine_ruche"
            type="text"
            placeholder="achat, don, fabrication…"
            className={CHAMP_CLASSE}
            value={origineRuche}
            onChange={(e) => setOrigineRuche(e.target.value)}
          />
        </div>

        <div>
          <p className="text-13 text-ink-secondary mb-1">Origine de la colonie</p>
          <Segmente
            options={ORIGINE_COLONIE_OPTIONS}
            value={origineColonie}
            onChange={setOrigineColonie}
          />
        </div>
      </section>

      {message && <p className="text-13 text-center text-ink-secondary">{message}</p>}

      <button
        type="button"
        onClick={enregistrer}
        className="h-[46px] w-full rounded bg-miel text-ink text-15 font-bold"
      >
        Enregistrer
      </button>

      {onRetour && (
        <button
          type="button"
          onClick={onRetour}
          className="h-12 w-full text-13 text-ink-secondary underline"
        >
          Retour
        </button>
      )}
    </div>
  );
}
