import { useEffect, useState } from 'react';
import { SelecteurUnique } from '../../components/SelecteurUnique.jsx';
import { EnTeteEcran } from '../../components/EnTeteEcran.jsx';
import { db } from '../../db/db.js';
import { enregistrerMouvement } from '../../db/repositories/mouvement.js';
import { creerTache } from '../../db/repositories/taches.js';
import { listerRuchers } from '../../db/repositories/ruchers.js';
import { deplacerRucheVersRucher } from '../../db/repositories/ruches.js';
import { TYPE_MOUVEMENT_LIBELLES } from '../../lib/libellesMouvement.js';

function ajouterJours(dateIso, jours) {
  const d = new Date(dateIso);
  d.setDate(d.getDate() + jours);
  return d.toISOString();
}

const TYPE_OPTIONS = Object.entries(TYPE_MOUVEMENT_LIBELLES).map(([value, label]) => ({
  value,
  label,
}));

const CHAMP_CLASSE =
  'w-full h-11 text-15 border border-rule-strong rounded px-2 bg-surface text-ink';

function dateDuJour() {
  return new Date().toISOString().slice(0, 10);
}

// Écran de saisie mouvement (lot L3, §4.2 `mouvement`). Pas de champ
// obligatoire. rucher_origine_id/rucher_destination_id (transhumance)
// activés le 14/08/2026 avec l'arrivée du multi-rucher — jusque-là
// l'exploitation ne comptait qu'un seul rucher, un sélecteur de
// destination n'aurait eu aucune option.
export function SaisieMouvement({ colonieId, onRetour, onEnregistre, onRucheDeplacee }) {
  const [ruche, setRuche] = useState(null);
  const [date, setDate] = useState(dateDuJour());
  const [type, setType] = useState(null);
  const [motif, setMotif] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState(null);
  const [ruchersDisponibles, setRuchersDisponibles] = useState([]);
  const [rucherDestinationId, setRucherDestinationId] = useState('');

  useEffect(() => {
    if (!colonieId) return;
    async function charger() {
      const colonie = await db.colonie.get(colonieId);
      const r = colonie ? await db.ruche.get(colonie.ruche_id) : null;
      setRuche(r ?? null);
      const tous = await listerRuchers();
      setRuchersDisponibles(tous.filter((rr) => rr.id !== r?.rucher_id));
    }
    charger();
  }, [colonieId]);

  // Rappel fixe (cahier des charges §6.3) : une division ne montre si elle a
  // réussi qu'à la ponte de la nouvelle reine — délai fixe faute de mieux à
  // ce stade (pas de date de naissance suivie).
  async function creerRappelSiNecessaire(mouvement) {
    if (mouvement.type !== 'division' || !mouvement.date) return;
    const maintenant = new Date().toISOString();
    await creerTache({
      id: crypto.randomUUID(),
      colonie_id: mouvement.colonie_id,
      rucher_id: ruche?.rucher_id ?? null,
      libelle: 'Contrôler la ponte de la nouvelle reine',
      date_echeance: ajouterJours(mouvement.date, 21),
      priorite: 'moyenne',
      origine: 'generee',
      regle_origine: 'mouvement_division',
      statut: 'a_faire',
      visite_declencheuse_id: null,
      created_at: maintenant,
      updated_at: maintenant,
      deleted_at: null,
    });
  }

  async function enregistrer() {
    if (!colonieId) return;
    const estTranshumance = type === 'transhumance';
    if (estTranshumance && !rucherDestinationId) {
      setMessage('Choisissez un rucher de destination.');
      return;
    }
    try {
      const rucherOrigineId = ruche?.rucher_id ?? null;
      // Le déplacement réel précède l'enregistrement du mouvement : si la
      // ruche n'a plus lieu d'être (colonie clôturée entre-temps, etc.),
      // autant échouer avant de créer une trace qui ne correspondrait à rien.
      if (estTranshumance && ruche) {
        await deplacerRucheVersRucher(ruche.id, rucherOrigineId, rucherDestinationId);
      }

      const maintenant = new Date().toISOString();
      const mouvement = {
        id: crypto.randomUUID(),
        ruche_id: ruche?.id ?? null,
        colonie_id: colonieId,
        date: date || null,
        type,
        rucher_origine_id: estTranshumance ? rucherOrigineId : null,
        rucher_destination_id: estTranshumance ? rucherDestinationId : null,
        motif: motif || null,
        notes: notes || null,
        created_at: maintenant,
        updated_at: maintenant,
        deleted_at: null,
      };
      await enregistrerMouvement(mouvement);
      await creerRappelSiNecessaire(mouvement);
      setMessage(estTranshumance ? 'Ruche déplacée et mouvement enregistré.' : 'Mouvement enregistré.');
      if (estTranshumance && onRucheDeplacee) {
        onRucheDeplacee();
      } else {
        onEnregistre?.(colonieId);
      }
    } catch (err) {
      console.error('[mouvement] échec enregistrement', err);
      setMessage("Erreur : le mouvement n'a pas pu être enregistré.");
    }
  }

  return (
    <div className="min-h-screen bg-ground text-ink flex flex-col max-w-md mx-auto">
      <EnTeteEcran
        retourLibelle="← Retour"
        onRetour={onRetour}
        titre={`${ruche ? `Ruche ${ruche.numero}` : 'Colonie'} — Mouvement`}
      />

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
          <SelecteurUnique options={TYPE_OPTIONS} value={type} onChange={setType} />
        </div>

        {type === 'transhumance' && (
          <div>
            <label className="text-13 text-ink-secondary mb-1 block" htmlFor="rucher_destination">
              Rucher de destination
            </label>
            {ruchersDisponibles.length === 0 ? (
              <p className="text-13 text-ink-secondary">
                Aucun autre rucher — créez-en un d'abord depuis l'accueil.
              </p>
            ) : (
              <select
                id="rucher_destination"
                className={CHAMP_CLASSE}
                value={rucherDestinationId}
                onChange={(e) => setRucherDestinationId(e.target.value)}
              >
                <option value="">Choisir…</option>
                {ruchersDisponibles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nom}
                  </option>
                ))}
              </select>
            )}
            <p className="text-11 text-ink-muted mt-1">
              Déplace réellement la ruche vers ce rucher — elle rejoint sa tournée, quitte
              celle d'ici.
            </p>
          </div>
        )}

        <div>
          <label className="text-13 text-ink-secondary mb-1 block" htmlFor="motif">
            Motif
          </label>
          <input
            id="motif"
            type="text"
            className={CHAMP_CLASSE}
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
          />
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
