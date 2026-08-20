import { useEffect, useState } from 'react';
import { EnTeteEcran } from '../../components/EnTeteEcran.jsx';
import { listerExercicesConnus } from '../../db/repositories/economie.js';
import { tableauDeBordExercice, seuilRentabiliteExploitation } from '../../lib/repartitionEconomique.js';

function libelleExercice(exercice) {
  return `${exercice}-${exercice + 1}`;
}

// F6.6 — coût de revient au kg par ruche, marge par ruche, contribution au
// résultat, seuil de rentabilité. §6.5 : jamais un chiffre isolé, toujours
// la série pluriannuelle — chaque indicateur ci-dessous est donc un tableau
// (rows=ruches, cols=exercices), même pattern que RendementRecolte.jsx, et
// le seuil de rentabilité (exploitation, "chiffres en héros" autorisés par
// arbitrage 18/08/2026) affiche l'exercice courant en grand, accompagné de
// sa propre mini-série en dessous plutôt que seul.
export function TableauDeBord({ onRetour }) {
  const [exercices, setExercices] = useState([]);
  const [parExercice, setParExercice] = useState({});
  const [seuils, setSeuils] = useState({});
  const [rucheNumeroParId, setRucheNumeroParId] = useState(new Map());

  useEffect(() => {
    async function charger() {
      const connus = await listerExercicesConnus();
      setExercices(connus);
      const donnees = {};
      const seuilsParExercice = {};
      const numeros = new Map();
      for (const exercice of connus) {
        const tdb = await tableauDeBordExercice(exercice);
        donnees[exercice] = tdb;
        tdb.lignes.forEach((l) => numeros.set(l.rucheId, l.rucheNumero));
        seuilsParExercice[exercice] = await seuilRentabiliteExploitation(exercice);
      }
      setParExercice(donnees);
      setSeuils(seuilsParExercice);
      setRucheNumeroParId(numeros);
    }
    charger();
  }, []);

  if (exercices.length === 0) {
    return (
      <div className="min-h-screen bg-ground text-ink flex flex-col max-w-4xl mx-auto">
        <EnTeteEcran retourLibelle="← Retour" onRetour={onRetour} titre="Tableau de bord" />
        <p className="p-4 text-13 text-ink-secondary">Aucune écriture enregistrée pour l'instant.</p>
      </div>
    );
  }

  const exerciceCourant = exercices[0];
  const seuilCourant = seuils[exerciceCourant];
  const toutesLesRuchesIds = [...rucheNumeroParId.keys()].sort((a, b) => rucheNumeroParId.get(a) - rucheNumeroParId.get(b));

  function tableauIndicateur(titre, extraire, formater) {
    return (
      <section className="flex flex-col gap-2">
        <h2 className="text-15 font-bold">{titre}</h2>
        <div className="overflow-x-auto bg-surface rounded border border-rule">
          <table className="w-full text-13 border-collapse">
            <thead>
              <tr className="border-b border-rule">
                <th className="text-left p-2 font-bold">Ruche</th>
                {exercices.map((ex) => (
                  <th key={ex} className="text-right p-2 font-bold whitespace-nowrap">
                    {libelleExercice(ex)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {toutesLesRuchesIds.map((rucheId) => (
                <tr key={rucheId} className="border-b border-rule last:border-0">
                  <td className="p-2">Ruche {rucheNumeroParId.get(rucheId)}</td>
                  {exercices.map((ex) => {
                    const ligne = parExercice[ex]?.lignes.find((l) => l.rucheId === rucheId);
                    return (
                      <td key={ex} className="text-right p-2 font-mono">
                        {ligne ? formater(extraire(ligne)) : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-ground text-ink flex flex-col max-w-4xl mx-auto">
      <EnTeteEcran retourLibelle="← Retour" onRetour={onRetour} titre="Tableau de bord" contexte={`Exercice ${libelleExercice(exerciceCourant)}`} />

      <div className="p-4 flex flex-col gap-6">
        <section className="bg-surface border border-rule rounded p-4 flex flex-col gap-2">
          <p className="text-11 font-mono uppercase text-ink-secondary">Seuil de rentabilité — exploitation</p>
          {seuilCourant?.calculable ? (
            <>
              <p className="text-26 font-bold font-mono">{seuilCourant.prixDeVenteMinimumAuKg.toFixed(2)} €/kg</p>
              <p className="text-13 text-ink-secondary">Prix de vente minimum au kg, sous lequel l'exploitation perd de l'argent.</p>
              {seuilCourant.kgAVendrePourEquilibrer != null ? (
                <p className="text-13 text-ink-secondary">
                  {seuilCourant.kgAVendrePourEquilibrer.toFixed(0)} kg à vendre pour équilibrer, au prix moyen de vente
                  observé — hypothèse : tout le miel produit sur l'exercice est vendu sur ce même exercice (aucun suivi
                  de stock dans l'application).
                </p>
              ) : (
                <p className="text-13 text-ink-secondary">Pas encore de vente de miel enregistrée pour estimer un prix moyen.</p>
              )}
            </>
          ) : (
            <p className="text-13 text-ink-secondary">Non calculable — aucune production de miel sur cet exercice.</p>
          )}
          <div className="flex gap-4 mt-2 text-11 text-ink-secondary font-mono">
            {exercices
              .filter((ex) => ex !== exerciceCourant)
              .map((ex) => (
                <span key={ex}>
                  {libelleExercice(ex)} : {seuils[ex]?.calculable ? `${seuils[ex].prixDeVenteMinimumAuKg.toFixed(2)} €/kg` : '—'}
                </span>
              ))}
          </div>
        </section>

        {tableauIndicateur(
          'Coût de revient au kg de miel',
          (l) => l.coutDeRevient,
          (v) => (v.calculable ? `${v.valeur.toFixed(2)} €/kg` : 'non calculable')
        )}

        {tableauIndicateur(
          'Marge',
          (l) => l.marge,
          (v) => `${v.toFixed(2)} €`
        )}

        {tableauIndicateur(
          'Contribution au résultat',
          (l) => l.contribution,
          (v) => (v.calculable ? `${v.valeur.toFixed(1)} %` : `${v.marge.toFixed(2)} € (résultat négatif)`)
        )}
      </div>
    </div>
  );
}
