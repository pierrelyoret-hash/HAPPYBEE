import { useState } from 'react';
import { Segmente } from '../../components/Segmente.jsx';
import { EnTeteEcran } from '../../components/EnTeteEcran.jsx';
import { enregistrerNourrissement } from '../../db/repositories/sanitaire.js';

const TYPE_OPTIONS = [
  { value: 'sirop_leger', label: 'Sirop léger' },
  { value: 'sirop_lourd', label: 'Sirop lourd' },
  { value: 'candi', label: 'Candi' },
  { value: 'pate_proteique', label: 'Pâte protéinée' },
];

const ORIGINE_OPTIONS = [
  { value: 'achete', label: 'Acheté' },
  { value: 'fabrique', label: 'Fabriqué' },
  { value: 'miel_exploitation', label: "Miel de l'exploitation" },
];

const CHAMP_CLASSE =
  'w-full h-11 text-15 border border-rule-strong rounded px-2 bg-surface text-ink';

function dateDuJour() {
  return new Date().toISOString().slice(0, 10);
}

// Pas de champ obligatoire (brief L2.2 §3). Quantité en saisie libre
// (nombre décimal) : les unités varient selon le type (kg, L, pains), pas
// de compteur à pas fixe adapté à tous les cas.
export function SaisieNourrissement({ colonieId, onRetour, onEnregistre }) {
  const [date, setDate] = useState(dateDuJour());
  const [type, setType] = useState(null);
  const [quantite, setQuantite] = useState('');
  const [unite, setUnite] = useState('');
  const [composition, setComposition] = useState('');
  const [origineProduit, setOrigineProduit] = useState(null);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState(null);

  async function enregistrer() {
    if (!colonieId) return;
    try {
      const maintenant = new Date().toISOString();
      const nourrissement = {
        id: crypto.randomUUID(),
        colonie_id: colonieId,
        date: date || null,
        type,
        quantite: quantite !== '' ? Number(quantite) : null,
        unite: unite || null,
        composition: composition || null,
        origine_produit: origineProduit,
        notes: notes || null,
        created_at: maintenant,
        updated_at: maintenant,
        deleted_at: null,
      };
      await enregistrerNourrissement(nourrissement);
      setMessage('Nourrissement enregistré.');
      onEnregistre?.(colonieId);
    } catch (err) {
      console.error('[sanitaire] échec enregistrement nourrissement', err);
      setMessage("Erreur : le nourrissement n'a pas pu être enregistré.");
    }
  }

  return (
    <div className="min-h-screen bg-ground text-ink flex flex-col max-w-md mx-auto">
      <EnTeteEcran retourLibelle="← Retour" onRetour={onRetour} titre="Nourrissement" />

      <div className="p-4 flex flex-col gap-4">

      <section className="flex flex-col gap-3">
        <div>
          <label className="text-13 text-ink-secondary mb-1 block" htmlFor="date">
            Date
          </label>
          <input
            id="date"
            type="date"
            className={CHAMP_CLASSE}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div>
          <p className="text-13 text-ink-secondary mb-1">Type</p>
          <Segmente options={TYPE_OPTIONS} value={type} onChange={setType} />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-13 text-ink-secondary mb-1 block" htmlFor="quantite">
              Quantité
            </label>
            <input
              id="quantite"
              type="number"
              step="0.1"
              className={CHAMP_CLASSE}
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="text-13 text-ink-secondary mb-1 block" htmlFor="unite">
              Unité
            </label>
            <input
              id="unite"
              type="text"
              placeholder="kg, L, pains…"
              className={CHAMP_CLASSE}
              value={unite}
              onChange={(e) => setUnite(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-13 text-ink-secondary mb-1 block" htmlFor="composition">
            Composition
          </label>
          <input
            id="composition"
            type="text"
            className={CHAMP_CLASSE}
            value={composition}
            onChange={(e) => setComposition(e.target.value)}
          />
        </div>

        <div>
          <p className="text-13 text-ink-secondary mb-1">Origine</p>
          <Segmente options={ORIGINE_OPTIONS} value={origineProduit} onChange={setOrigineProduit} />
        </div>

        <div>
          <label className="text-13 text-ink-secondary mb-1 block" htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            className="w-full border border-rule-strong rounded p-2 text-15 bg-surface text-ink"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </section>

      {message && <p className="text-13 text-center text-ink-secondary">{message}</p>}

      <button
        type="button"
        onClick={enregistrer}
        className="h-[46px] w-full rounded bg-ink text-surface text-15 font-bold"
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
    </div>
  );
}
