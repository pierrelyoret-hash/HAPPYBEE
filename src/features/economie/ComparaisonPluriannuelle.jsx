import { useEffect, useState } from 'react';
import { EnTeteEcran } from '../../components/EnTeteEcran.jsx';
import { listerExercicesConnus, comparaisonParPoste } from '../../db/repositories/economie.js';
import { listerToutesLesRuches } from '../../db/repositories/ruches.js';
import { chargesTotalesRuche } from '../../lib/repartitionEconomique.js';

function libelleExercice(exercice) {
  return `${exercice}-${exercice + 1}`;
}

// L5.9, priorité S — "par ruche et par poste" (brief §7). Même grammaire de
// tableau que RendementRecolte.jsx / TableauDeBord.jsx (rows × exercices,
// réemploi assumé plutôt qu'une nouvelle mise en page, cadrage UX L4 §5).
export function ComparaisonPluriannuelle({ onRetour }) {
  const [exercices, setExercices] = useState([]);
  const [chargesParRuche, setChargesParRuche] = useState([]);
  const [parPoste, setParPoste] = useState(null);

  useEffect(() => {
    async function charger() {
      const connus = await listerExercicesConnus();
      setExercices(connus);
      setParPoste(await comparaisonParPoste());
    }
    charger();
  }, []);

  useEffect(() => {
    async function chargerParRuche() {
      if (exercices.length === 0) return;
      const ruches = await listerToutesLesRuches();
      const lignes = [];
      for (const ruche of ruches) {
        const parExercice = {};
        for (const exercice of exercices) {
          parExercice[exercice] = await chargesTotalesRuche(ruche.id, exercice);
        }
        lignes.push({ rucheId: ruche.id, rucheNumero: ruche.numero, parExercice });
      }
      setChargesParRuche(lignes);
    }
    chargerParRuche();
  }, [exercices]);

  if (parPoste === null) return null;

  return (
    <div className="min-h-screen bg-ground text-ink flex flex-col max-w-4xl mx-auto">
      <EnTeteEcran retourLibelle="← Retour" onRetour={onRetour} titre="Comparaison pluriannuelle" />

      <div className="p-4 flex flex-col gap-6">
        {exercices.length === 0 ? (
          <p className="text-13 text-ink-secondary">Aucune écriture enregistrée pour l'instant.</p>
        ) : (
          <>
            <section className="flex flex-col gap-2">
              <h2 className="text-15 font-bold">Charges totales par ruche</h2>
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
                    {chargesParRuche.map((l) => (
                      <tr key={l.rucheId} className="border-b border-rule last:border-0">
                        <td className="p-2">Ruche {l.rucheNumero}</td>
                        {exercices.map((ex) => (
                          <td key={ex} className="text-right p-2 font-mono">
                            {l.parExercice[ex].toFixed(2)} €
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-15 font-bold">Par poste (catégorie)</h2>
              <div className="overflow-x-auto bg-surface rounded border border-rule">
                <table className="w-full text-13 border-collapse">
                  <thead>
                    <tr className="border-b border-rule">
                      <th className="text-left p-2 font-bold">Catégorie</th>
                      {parPoste.exercices.map((ex) => (
                        <th key={ex} className="text-right p-2 font-bold whitespace-nowrap">
                          {libelleExercice(ex)}
                        </th>
                      ))}
                      <th className="text-right p-2 font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parPoste.lignes.map((l) => (
                      <tr key={l.libelle} className="border-b border-rule last:border-0">
                        <td className="p-2">{l.libelle}</td>
                        {parPoste.exercices.map((ex) => (
                          <td key={ex} className={`text-right p-2 font-mono ${l.sens === 'depense' ? 'text-urgent-ink' : 'text-vert'}`}>
                            {l.parExercice[ex] != null ? l.parExercice[ex].toFixed(2) : '—'}
                          </td>
                        ))}
                        <td className={`text-right p-2 font-mono font-bold ${l.sens === 'depense' ? 'text-urgent-ink' : 'text-vert'}`}>
                          {l.total.toFixed(2)} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
