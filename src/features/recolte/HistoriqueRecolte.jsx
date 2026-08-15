import { useEffect, useState } from 'react';
import { db } from '../../db/db.js';
import { listerHistoriqueRecolte } from '../../db/repositories/recolte.js';
import { surSync } from '../../lib/sync.js';
import { EnTeteEcran } from '../../components/EnTeteEcran.jsx';
import { PRODUIT_LIBELLES, MODE_SAISIE_LIBELLES } from '../../lib/libellesRecolte.js';

function dateLisible(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('fr-FR');
}

export function HistoriqueRecolte({ colonieId, onRetour, onOuvrirSaisieRecolte, onOuvrirRendement }) {
  const [ruche, setRuche] = useState(null);
  const [lignes, setLignes] = useState(null);

  useEffect(() => {
    if (!colonieId) return;
    async function charger() {
      const colonie = await db.colonie.get(colonieId);
      const r = colonie ? await db.ruche.get(colonie.ruche_id) : null;
      setRuche(r ?? null);
      setLignes(await listerHistoriqueRecolte(colonieId));
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
        titre={`${ruche ? `Ruche ${ruche.numero}` : 'Colonie'} — Récolte`}
      />

      <div className="p-4 flex flex-col gap-4">

      <div className="flex flex-col gap-2">
        {onOuvrirSaisieRecolte && (
          <button
            type="button"
            onClick={() => onOuvrirSaisieRecolte(colonieId)}
            className="h-11 w-full rounded bg-ink text-surface text-15 font-bold"
          >
            + Récolte
          </button>
        )}
        {onOuvrirRendement && (
          <button
            type="button"
            onClick={onOuvrirRendement}
            className="h-11 w-full rounded border border-rule-strong text-ink text-15 font-bold"
          >
            Tableau de rendement
          </button>
        )}
      </div>

      {lignes.length === 0 && (
        <p className="text-13 text-ink-secondary">Aucune récolte enregistrée pour cette colonie.</p>
      )}

      <ul className="bg-surface rounded border border-rule divide-y divide-rule">
        {lignes.map((ligne) => (
          <li key={ligne.id} className="p-3">
            <p className="text-15 font-bold">
              {PRODUIT_LIBELLES[ligne.produit] ?? ligne.produit ?? 'Récolte'}
              {ligne.poids_net != null ? ` — ${ligne.poids_net} kg` : ''}
            </p>
            <p className="text-11 text-ink-muted mb-2">
              {dateLisible(ligne.date) ?? 'date non renseignée'}
              {ligne.mode_saisie ? ` · ${MODE_SAISIE_LIBELLES[ligne.mode_saisie] ?? ligne.mode_saisie}` : ''}
            </p>
            {ligne.type_miellee && (
              <p className="text-13 text-ink-secondary">Miellée : {ligne.type_miellee}</p>
            )}
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
