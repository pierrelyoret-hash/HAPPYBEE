import { useEffect, useState } from 'react';
import { db } from '../../db/db.js';
import { listerHistoriqueMouvement } from '../../db/repositories/mouvement.js';
import { surSync } from '../../lib/sync.js';
import { EnTeteEcran } from '../../components/EnTeteEcran.jsx';
import { TYPE_MOUVEMENT_LIBELLES } from '../../lib/libellesMouvement.js';

function dateLisible(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('fr-FR');
}

export function HistoriqueMouvement({ colonieId, onRetour, onOuvrirSaisieMouvement }) {
  const [ruche, setRuche] = useState(null);
  const [lignes, setLignes] = useState(null);

  useEffect(() => {
    if (!colonieId) return;
    async function charger() {
      const colonie = await db.colonie.get(colonieId);
      const r = colonie ? await db.ruche.get(colonie.ruche_id) : null;
      setRuche(r ?? null);
      setLignes(await listerHistoriqueMouvement(colonieId));
    }
    charger();
    return surSync(charger);
  }, [colonieId]);

  if (lignes === null) return null;

  return (
    <div className="min-h-screen bg-ground text-ink flex flex-col max-w-md mx-auto">
      <EnTeteEcran
        retourLibelle="← Retour"
        onRetour={onRetour}
        titre={`${ruche ? `Ruche ${ruche.numero}` : 'Colonie'} — Mouvements`}
      />

      <div className="p-4 flex flex-col gap-4">

      {onOuvrirSaisieMouvement && (
        <button
          type="button"
          onClick={() => onOuvrirSaisieMouvement(colonieId)}
          className="h-11 w-full rounded bg-ink text-surface text-15 font-bold"
        >
          + Mouvement
        </button>
      )}

      {lignes.length === 0 && (
        <p className="text-13 text-ink-secondary">Aucun mouvement enregistré pour cette colonie.</p>
      )}

      <ul className="bg-surface rounded border border-rule divide-y divide-rule">
        {lignes.map((ligne) => (
          <li key={ligne.id} className="p-3">
            <p className="text-15 font-bold">
              {TYPE_MOUVEMENT_LIBELLES[ligne.type] ?? ligne.type ?? 'Mouvement'}
            </p>
            <p className="text-11 text-ink-muted mb-2">{dateLisible(ligne.date) ?? 'date non renseignée'}</p>
            {(ligne.rucherOrigineNom || ligne.rucherDestinationNom) && (
              <p className="text-13 text-ink-secondary">
                {ligne.rucherOrigineNom ?? '?'} → {ligne.rucherDestinationNom ?? '?'}
              </p>
            )}
            {ligne.motif && <p className="text-13 text-ink-secondary">Motif : {ligne.motif}</p>}
            {ligne.notes && <p className="text-13 text-ink-secondary mt-1 italic">« {ligne.notes} »</p>}
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
    </div>
  );
}
