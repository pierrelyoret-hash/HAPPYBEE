import { useEffect, useState } from 'react';
import { EnTeteEcran } from '../../components/EnTeteEcran.jsx';
import {
  obtenirRucher,
  creerRucher,
  modifierRucher,
  archiverRucher,
} from '../../db/repositories/ruchers.js';

const CHAMP_CLASSE =
  'w-full h-11 text-15 border border-rule-strong rounded px-2 bg-surface text-ink';

// F1.1 — créer ou modifier un rucher. Aucun champ obligatoire, comme
// partout ailleurs dans l'application.
export function SaisieRucher({ rucherId, onRetour, onEnregistre }) {
  const [nom, setNom] = useState('');
  const [commune, setCommune] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [altitude, setAltitude] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!rucherId) return;
    obtenirRucher(rucherId).then((rucher) => {
      if (!rucher) return;
      setNom(rucher.nom ?? '');
      setCommune(rucher.commune ?? '');
      setLatitude(rucher.latitude ?? '');
      setLongitude(rucher.longitude ?? '');
      setAltitude(rucher.altitude ?? '');
      setNotes(rucher.notes ?? '');
    });
  }, [rucherId]);

  async function enregistrer() {
    try {
      const maintenant = new Date().toISOString();
      const champs = {
        nom: nom || null,
        commune: commune || null,
        latitude: latitude !== '' ? Number(latitude) : null,
        longitude: longitude !== '' ? Number(longitude) : null,
        altitude: altitude !== '' ? Number(altitude) : null,
        notes: notes || null,
      };
      if (rucherId) {
        await modifierRucher(rucherId, champs);
        onEnregistre?.(rucherId);
      } else {
        const id = crypto.randomUUID();
        await creerRucher({
          id,
          ...champs,
          date_creation: maintenant,
          date_fermeture: null,
          environnement: null,
          ordre_tournee: [],
          created_at: maintenant,
          updated_at: maintenant,
          deleted_at: null,
        });
        onEnregistre?.(id);
      }
    } catch (err) {
      console.error('[rucher] échec enregistrement', err);
      setMessage("Erreur : le rucher n'a pas pu être enregistré.");
    }
  }

  async function archiver() {
    if (!rucherId) return;
    await archiverRucher(rucherId);
    onRetour?.();
  }

  return (
    <div className="min-h-screen bg-ground text-ink flex flex-col max-w-md mx-auto">
      <EnTeteEcran
        retourLibelle="← Retour"
        onRetour={onRetour}
        titre={rucherId ? 'Modifier le rucher' : 'Nouveau rucher'}
      />

      <div className="p-4 flex flex-col gap-4">

      <section className="flex flex-col gap-3">
        <div>
          <label className="text-13 text-ink-secondary mb-1 block" htmlFor="nom">
            Nom
          </label>
          <input
            id="nom"
            type="text"
            className={CHAMP_CLASSE}
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />
        </div>
        <div>
          <label className="text-13 text-ink-secondary mb-1 block" htmlFor="commune">
            Commune
          </label>
          <input
            id="commune"
            type="text"
            className={CHAMP_CLASSE}
            value={commune}
            onChange={(e) => setCommune(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-13 text-ink-secondary mb-1 block" htmlFor="latitude">
              Latitude
            </label>
            <input
              id="latitude"
              type="number"
              step="0.0001"
              className={CHAMP_CLASSE}
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="text-13 text-ink-secondary mb-1 block" htmlFor="longitude">
              Longitude
            </label>
            <input
              id="longitude"
              type="number"
              step="0.0001"
              className={CHAMP_CLASSE}
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="text-13 text-ink-secondary mb-1 block" htmlFor="altitude">
              Altitude (m)
            </label>
            <input
              id="altitude"
              type="number"
              className={CHAMP_CLASSE}
              value={altitude}
              onChange={(e) => setAltitude(e.target.value)}
            />
          </div>
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
        className="h-[46px] w-full rounded bg-miel text-ink text-15 font-bold"
      >
        Enregistrer
      </button>

      {rucherId && (
        <button
          type="button"
          onClick={archiver}
          className="h-12 w-full text-13 text-bordeaux underline"
        >
          Archiver ce rucher
        </button>
      )}

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
