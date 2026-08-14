import { useEffect, useState } from 'react';
import { Segmente } from '../../components/Segmente.jsx';
import { BoutonRetour } from '../../components/BoutonRetour.jsx';
import { obtenirPremierRucher } from '../../db/repositories/ruchers.js';
import { listerColoniesActives } from '../../db/repositories/colonies.js';
import {
  listerTachesAvecContexte,
  creerTache,
  marquerTacheFaite,
} from '../../db/repositories/taches.js';
import { surSync } from '../../lib/sync.js';

const PRIORITE_OPTIONS = [
  { value: 'urgente', label: 'Urgente' },
  { value: 'moyenne', label: 'Moyenne' },
  { value: 'faible', label: 'Faible' },
];

const PRIORITE_LIBELLES = { urgente: 'Urgente', moyenne: 'Moyenne', faible: 'Faible' };

const CHAMP_CLASSE =
  'w-full h-11 text-15 border border-rule-strong rounded px-2 bg-surface text-ink';

function dateLisible(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('fr-FR');
}

function estEchue(iso) {
  return !!iso && new Date(iso).getTime() <= Date.now();
}

// F7.1 (création manuelle) + F7.3 (vue "à faire" consolidée) — lot L3.
export function TachesAFaire({ onRetour }) {
  const [rucher, setRucher] = useState(null);
  const [colonies, setColonies] = useState([]);
  const [taches, setTaches] = useState(null);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [libelle, setLibelle] = useState('');
  const [dateEcheance, setDateEcheance] = useState('');
  const [priorite, setPriorite] = useState('moyenne');
  const [colonieId, setColonieId] = useState('');

  async function charger() {
    const r = await obtenirPremierRucher();
    setRucher(r ?? null);
    if (!r) {
      setTaches([]);
      return;
    }
    setColonies(await listerColoniesActives());
    setTaches(await listerTachesAvecContexte(r.id));
  }

  useEffect(() => {
    charger();
    return surSync(charger);
  }, []);

  async function enregistrerTache() {
    if (!rucher) return;
    const colonie = colonies.find((c) => c.colonie.id === colonieId);
    const maintenant = new Date().toISOString();
    await creerTache({
      id: crypto.randomUUID(),
      colonie_id: colonie?.colonie.id ?? null,
      rucher_id: rucher.id,
      libelle,
      date_echeance: dateEcheance ? new Date(dateEcheance).toISOString() : null,
      priorite,
      origine: 'manuelle',
      regle_origine: null,
      statut: 'a_faire',
      visite_declencheuse_id: null,
      created_at: maintenant,
      updated_at: maintenant,
      deleted_at: null,
    });
    setLibelle('');
    setDateEcheance('');
    setPriorite('moyenne');
    setColonieId('');
    setFormulaireOuvert(false);
    await charger();
  }

  async function terminer(tacheId) {
    await marquerTacheFaite(tacheId);
    await charger();
  }

  if (taches === null) return null;

  return (
    <div className="min-h-screen bg-ground text-ink p-4 flex flex-col gap-4 max-w-md mx-auto">
      <header className="flex flex-col gap-1">
        <BoutonRetour onRetour={onRetour} />
        <h1 className="text-20 font-bold">Tâches</h1>
      </header>

      <button
        type="button"
        onClick={() => setFormulaireOuvert((v) => !v)}
        className="h-11 w-full rounded bg-ink text-surface text-15 font-bold"
      >
        {formulaireOuvert ? 'Annuler' : '+ Tâche'}
      </button>

      {formulaireOuvert && (
        <section className="flex flex-col gap-3 bg-surface rounded border border-rule p-3">
          <div>
            <label className="text-13 text-ink-secondary mb-1 block" htmlFor="libelle">
              Libellé
            </label>
            <input
              id="libelle"
              type="text"
              className={CHAMP_CLASSE}
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
            />
          </div>
          <div>
            <label className="text-13 text-ink-secondary mb-1 block" htmlFor="echeance">
              Échéance
            </label>
            <input
              id="echeance"
              type="date"
              className={CHAMP_CLASSE}
              value={dateEcheance}
              onChange={(e) => setDateEcheance(e.target.value)}
            />
          </div>
          <div>
            <p className="text-13 text-ink-secondary mb-1">Priorité</p>
            <Segmente options={PRIORITE_OPTIONS} value={priorite} onChange={setPriorite} />
          </div>
          <div>
            <label className="text-13 text-ink-secondary mb-1 block" htmlFor="colonie">
              Colonie concernée
            </label>
            <select
              id="colonie"
              className={CHAMP_CLASSE}
              value={colonieId}
              onChange={(e) => setColonieId(e.target.value)}
            >
              <option value="">Rucher entier</option>
              {colonies.map(({ colonie, ruche }) => (
                <option key={colonie.id} value={colonie.id}>
                  Ruche {ruche.numero}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={enregistrerTache}
            disabled={!libelle}
            className="h-11 w-full rounded bg-ink text-surface text-15 font-bold disabled:opacity-40"
          >
            Enregistrer
          </button>
        </section>
      )}

      {taches.length === 0 && <p className="text-13 text-ink-secondary">Aucune tâche ouverte.</p>}

      <ul className="bg-surface rounded border border-rule divide-y divide-rule">
        {taches.map((t) => (
          <li key={t.id} className="p-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`text-14 font-bold ${estEchue(t.date_echeance) ? 'text-urgent-ink' : 'text-ink'}`}>
                {t.rucheNumero != null ? `Ruche ${t.rucheNumero} — ` : ''}
                {t.libelle}
              </p>
              <p className="text-11 text-ink-muted">
                {t.date_echeance ? `Échéance : ${dateLisible(t.date_echeance)}` : 'Sans échéance'} ·{' '}
                {PRIORITE_LIBELLES[t.priorite] ?? t.priorite}
              </p>
            </div>
            <button
              type="button"
              onClick={() => terminer(t.id)}
              className="text-13 text-ink-secondary underline shrink-0 mt-0.5"
            >
              ✓ Fait
            </button>
          </li>
        ))}
      </ul>

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
