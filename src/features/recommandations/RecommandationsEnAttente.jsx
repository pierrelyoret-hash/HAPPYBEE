import { useEffect, useState } from 'react';
import { EnTeteEcran } from '../../components/EnTeteEcran.jsx';
import {
  listerRecommandationsEnAttente,
  enrichirAvecContexte,
} from '../../db/repositories/recommandations.js';
import { surSync } from '../../lib/sync.js';

// Encre pleine seule (pas de fond teinté propre) — l'urgence du moteur
// (1-3) n'est pas l'état urgent/action/à visiter/normale de PastilleEtat
// (lib/etats.js, tâches à échéance), les deux ne doivent pas se confondre
// visuellement.
const URGENCE_LIBELLES = { 1: 'Faible', 2: 'Moyenne', 3: 'Urgente' };
const URGENCE_CLASSES = {
  1: 'bg-normale-bg text-normale-ink',
  2: 'bg-attente-bg text-attente-ink',
  3: 'bg-urgent-bg text-urgent-ink',
};

// F12.2 (§7 du brief) : recommandations en attente, triées par urgence —
// sur l'écran d'accueil, à côté du bloc "à faire en premier" (Tâches)
// existant, jamais à sa place : une recommandation n'est pas une tâche
// tant qu'elle n'est pas validée (§2.1).
export function RecommandationsEnAttente({ onRetour, onOuvrirDetail, onOuvrirHistorique, onOuvrirParametrage }) {
  const [recommandations, setRecommandations] = useState(null);

  async function charger() {
    const brutes = await listerRecommandationsEnAttente();
    const enrichies = await enrichirAvecContexte(brutes);
    enrichies.sort((a, b) => b.urgence - a.urgence || a.date_emission.localeCompare(b.date_emission));
    setRecommandations(enrichies);
  }

  useEffect(() => {
    charger();
    return surSync(charger);
  }, []);

  if (recommandations === null) return null;

  return (
    <div className="min-h-screen bg-ground text-ink flex flex-col max-w-md mx-auto pb-14">
      <EnTeteEcran retourLibelle="← Retour" onRetour={onRetour} titre="Recommandations" />

      <div className="p-4 flex flex-col gap-4">
        {recommandations.length === 0 && (
          <p className="text-13 text-ink-secondary">Aucune recommandation en attente.</p>
        )}

        <ul className="bg-surface rounded border border-rule divide-y divide-rule">
          {recommandations.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onOuvrirDetail(r.id)}
                className="w-full text-left p-3 flex items-start justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-14 font-bold text-ink">
                    {r.rucheNumero != null
                      ? `${r.rucherNom ? `${r.rucherNom} — ` : ''}Ruche ${r.rucheNumero} — `
                      : r.rucherNom
                        ? `${r.rucherNom} — `
                        : ''}
                    {r.enonce}
                  </p>
                  <p className="text-11 text-ink-muted">{r.regle_code}</p>
                </div>
                <span
                  className={`text-11 font-bold rounded px-1.5 py-0.5 shrink-0 ${URGENCE_CLASSES[r.urgence] ?? URGENCE_CLASSES[1]}`}
                >
                  {URGENCE_LIBELLES[r.urgence] ?? '—'}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-1 pt-2 border-t border-rule">
          <button type="button" onClick={onOuvrirHistorique} className="text-13 text-ink-secondary underline self-start">
            Voir l'historique des recommandations
          </button>
          <button type="button" onClick={onOuvrirParametrage} className="text-13 text-ink-secondary underline self-start">
            Paramétrer les règles
          </button>
        </div>

        {onRetour && (
          <button type="button" onClick={onRetour} className="h-12 w-full text-13 text-ink-secondary underline">
            Retour à l'accueil
          </button>
        )}
      </div>
    </div>
  );
}
