import { useEffect, useState } from 'react';
import { EnTeteEcran } from '../../components/EnTeteEcran.jsx';
import { Segmente } from '../../components/Segmente.jsx';
import { listerTiers, creerTiers, supprimerTiers } from '../../db/repositories/economie.js';

const TYPE_OPTIONS = [
  { value: 'fournisseur', label: 'Fournisseur' },
  { value: 'beneficiaire', label: 'Bénéficiaire' },
];

const TYPE_LIBELLES = { fournisseur: 'Fournisseur', beneficiaire: 'Bénéficiaire' };

// Registre de bureau (cadrage UX L4 §1) : conteneur plus large qu'un écran
// de terrain, mais toujours praticable à 375 px — voir la note sur
// max-w-3xl plutôt que max-w-md utilisé ailleurs dans l'application.
export function Tiers({ onRetour }) {
  const [tiers, setTiers] = useState([]);
  const [nom, setNom] = useState('');
  const [type, setType] = useState('fournisseur');
  const [notes, setNotes] = useState('');

  async function charger() {
    setTiers(await listerTiers());
  }

  useEffect(() => {
    charger();
  }, []);

  async function ajouter(e) {
    e.preventDefault();
    if (!nom.trim()) return;
    await creerTiers({ nom: nom.trim(), type, notes: notes.trim() || null });
    setNom('');
    setNotes('');
    await charger();
  }

  async function supprimer(id) {
    await supprimerTiers(id);
    await charger();
  }

  return (
    <div className="min-h-screen bg-ground text-ink flex flex-col max-w-3xl mx-auto">
      <EnTeteEcran retourLibelle="← Retour" onRetour={onRetour} titre="Fournisseurs et bénéficiaires" />

      <div className="p-4 flex flex-col gap-4">
        <form onSubmit={ajouter} className="flex flex-col gap-3 bg-surface border border-rule rounded p-3">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <label className="text-13 text-ink-secondary mb-1 block" htmlFor="nom">
                Nom
              </label>
              <input
                id="nom"
                type="text"
                autoFocus
                className="w-full h-11 text-15 border border-rule-strong rounded px-2 bg-surface text-ink"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
              />
            </div>
            <div>
              <p className="text-13 text-ink-secondary mb-1">Type</p>
              <Segmente options={TYPE_OPTIONS} value={type} onChange={setType} />
            </div>
          </div>
          <input
            type="text"
            placeholder="Notes (facultatif)"
            className="w-full h-11 text-15 border border-rule-strong rounded px-2 bg-surface text-ink"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button type="submit" className="h-11 self-start px-4 rounded bg-ink text-surface text-13 font-bold">
            Ajouter
          </button>
        </form>

        <div className="flex flex-col gap-2">
          {tiers.length === 0 && <p className="text-13 text-ink-secondary">Aucun tiers enregistré.</p>}
          {tiers.map((t) => (
            <div key={t.id} className="flex items-center gap-3 bg-surface border border-rule rounded p-3">
              <div className="flex-1">
                <p className="text-15 font-bold">{t.nom}</p>
                <p className="text-11 text-ink-secondary">
                  {TYPE_LIBELLES[t.type] ?? t.type}
                  {t.notes ? ` · ${t.notes}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => supprimer(t.id)}
                className="h-11 px-3 text-13 text-urgent-ink underline"
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
