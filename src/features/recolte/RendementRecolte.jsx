import { useEffect, useState } from 'react';
import { obtenirRendementParColonieEtAnnee } from '../../db/repositories/recolte.js';
import { surSync } from '../../lib/sync.js';
import { BoutonRetour } from '../../components/BoutonRetour.jsx';
import { PRODUIT_LIBELLES } from '../../lib/libellesRecolte.js';

function arrondi(n) {
  return Math.round(n * 10) / 10;
}

// F4.4 — un tableau par produit, lignes = colonies (repérées "Ruche N",
// même convention que le reste de l'application), colonnes = années
// (comparaison pluriannuelle) + total.
export function RendementRecolte({ onRetour }) {
  const [donnees, setDonnees] = useState(null);

  useEffect(() => {
    async function charger() {
      setDonnees(await obtenirRendementParColonieEtAnnee());
    }
    charger();
    return surSync(charger);
  }, []);

  if (donnees === null) return null;

  const produits = Object.keys(donnees.parProduit);

  return (
    <div className="min-h-screen bg-ground text-ink p-4 flex flex-col gap-4 max-w-md mx-auto">
      <header className="flex flex-col gap-1">
        <BoutonRetour onRetour={onRetour} />
        <h1 className="text-20 font-bold">Tableau de rendement</h1>
      </header>

      {produits.length === 0 && (
        <p className="text-13 text-ink-secondary">Aucune récolte enregistrée pour l'instant.</p>
      )}

      {produits.map((produit) => (
        <section key={produit} className="flex flex-col gap-2">
          <h2 className="text-15 font-bold">{PRODUIT_LIBELLES[produit] ?? produit}</h2>
          <div className="overflow-x-auto bg-surface rounded border border-rule">
            <table className="w-full text-13 border-collapse">
              <thead>
                <tr className="border-b border-rule">
                  <th className="text-left p-2 font-bold">Ruche</th>
                  {donnees.annees.map((annee) => (
                    <th key={annee} className="text-right p-2 font-bold whitespace-nowrap">
                      {annee}
                    </th>
                  ))}
                  <th className="text-right p-2 font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {donnees.parProduit[produit].map((ligne) => (
                  <tr key={ligne.colonieId} className="border-b border-rule last:border-0">
                    <td className="p-2">Ruche {ligne.rucheNumero}</td>
                    {donnees.annees.map((annee) => (
                      <td key={annee} className="text-right p-2 font-mono">
                        {ligne.parAnnee[annee] != null ? arrondi(ligne.parAnnee[annee]) : '—'}
                      </td>
                    ))}
                    <td className="text-right p-2 font-mono font-bold">{arrondi(ligne.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

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
