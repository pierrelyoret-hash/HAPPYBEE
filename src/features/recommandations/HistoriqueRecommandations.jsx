import { useEffect, useState } from 'react';
import { EnTeteEcran } from '../../components/EnTeteEcran.jsx';
import { listerRecommandationsHistorique, enrichirAvecContexte } from '../../db/repositories/recommandations.js';

const STATUT_LIBELLES = { validee: 'Validée', rejetee: 'Rejetée', differee: 'Différée' };
const STATUT_CLASSES = {
  validee: 'bg-normale-bg text-normale-ink',
  rejetee: 'bg-urgent-bg text-urgent-ink',
  differee: 'bg-attente-bg text-attente-ink',
};

function dateLisible(iso) {
  return iso ? new Date(iso).toLocaleDateString('fr-FR') : null;
}

// F12.10 : historique des recommandations déjà traitées, rejetées comprises
// avec leur motif.
export function HistoriqueRecommandations({ onRetour }) {
  const [recommandations, setRecommandations] = useState(null);

  useEffect(() => {
    listerRecommandationsHistorique()
      .then(enrichirAvecContexte)
      .then(setRecommandations);
  }, []);

  if (recommandations === null) return null;

  return (
    <div className="min-h-screen bg-ground text-ink flex flex-col max-w-md mx-auto pb-14">
      <EnTeteEcran retourLibelle="← Retour" onRetour={onRetour} titre="Historique des recommandations" />

      <div className="p-4 flex flex-col gap-4">
        {recommandations.length === 0 && (
          <p className="text-13 text-ink-secondary">Aucune recommandation traitée pour l'instant.</p>
        )}

        <ul className="bg-surface rounded border border-rule divide-y divide-rule">
          {recommandations.map((r) => (
            <li key={r.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-14 font-bold text-ink min-w-0">
                  {r.rucheNumero != null
                    ? `${r.rucherNom ? `${r.rucherNom} — ` : ''}Ruche ${r.rucheNumero} — `
                    : r.rucherNom
                      ? `${r.rucherNom} — `
                      : ''}
                  {r.enonce}
                </p>
                <span className={`text-11 font-bold rounded px-1.5 py-0.5 shrink-0 ${STATUT_CLASSES[r.statut] ?? ''}`}>
                  {STATUT_LIBELLES[r.statut] ?? r.statut}
                </span>
              </div>
              <p className="text-11 text-ink-muted mt-0.5">
                {r.regle_code} · traitée le {dateLisible(r.traitee_le) ?? '—'}
                {r.statut === 'rejetee' && ` · motif : ${r.motif_rejet ?? 'non précisé'}`}
                {r.statut === 'differee' && r.differee_au && ` · reprend le ${dateLisible(r.differee_au)}`}
              </p>
            </li>
          ))}
        </ul>

        {onRetour && (
          <button type="button" onClick={onRetour} className="h-12 w-full text-13 text-ink-secondary underline">
            Retour
          </button>
        )}
      </div>
    </div>
  );
}
