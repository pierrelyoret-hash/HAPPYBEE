import { useEffect, useState } from 'react';
import { EnTeteEcran } from '../../components/EnTeteEcran.jsx';
import {
  obtenirImmobilisation,
  modifierImmobilisation,
  listerDotations,
  modifierCleRepartitionDotation,
  rattacherImmobilisationRuche,
  detacherImmobilisationRuche,
} from '../../db/repositories/immobilisations.js';
import { listerToutesLesRuches } from '../../db/repositories/ruches.js';

const CLE_LIBELLES = {
  egale: 'Égale',
  prorata_production: 'Prorata production',
  prorata_nb_ruches: 'Prorata nb ruches',
  manuelle: 'Manuelle',
};

// F6.5 — fiche + échéancier des dotations. Le rattachement direct à une
// ruche (brief §6.4) court-circuite la clé de répartition pour toutes les
// lignes de l'échéancier : affichage plutôt que de laisser l'exploitant
// éditer une clé qui ne sera jamais appliquée tant que le lien existe.
export function FicheImmobilisation({ immobilisationId, onRetour }) {
  const [immobilisation, setImmobilisation] = useState(null);
  const [dotations, setDotations] = useState([]);
  const [ruches, setRuches] = useState([]);
  const [rucheRattachee, setRucheRattachee] = useState(null);
  const [dateSortie, setDateSortie] = useState('');

  async function charger() {
    const immo = await obtenirImmobilisation(immobilisationId);
    setImmobilisation(immo);
    setDateSortie(immo?.date_sortie ?? '');
    setDotations(await listerDotations(immobilisationId));
    const toutes = await listerToutesLesRuches();
    setRuches(toutes);
    setRucheRattachee(toutes.find((r) => r.immobilisation_id === immobilisationId) ?? null);
  }

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immobilisationId]);

  async function changerRattachement(rucheId) {
    if (rucheRattachee) await detacherImmobilisationRuche(rucheRattachee.id);
    if (rucheId) await rattacherImmobilisationRuche(rucheId, immobilisationId);
    await charger();
  }

  async function enregistrerSortie() {
    await modifierImmobilisation(immobilisationId, { date_sortie: dateSortie || null });
    await charger();
  }

  async function changerCle(exercice, cle) {
    await modifierCleRepartitionDotation(immobilisationId, exercice, cle);
    await charger();
  }

  if (!immobilisation) return null;

  return (
    <div className="min-h-screen bg-ground text-ink flex flex-col max-w-3xl mx-auto">
      <EnTeteEcran retourLibelle="← Retour" onRetour={onRetour} titre={immobilisation.libelle} />

      <div className="p-4 flex flex-col gap-4">
        <div className="bg-surface border border-rule rounded p-3 flex flex-col gap-1 text-13">
          <p>Acquise le {immobilisation.date_acquisition} — {immobilisation.valeur_acquisition.toFixed(2)} €</p>
          <p>Durée d'amortissement : {immobilisation.duree_amortissement_annees} ans</p>
          {immobilisation.valeur_residuelle != null && <p>Valeur résiduelle : {immobilisation.valeur_residuelle.toFixed(2)} €</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-13 text-ink-secondary" htmlFor="ruche-rattachee">
            Rattachée directement à une ruche (sans clé de répartition)
          </label>
          <select
            id="ruche-rattachee"
            className="h-11 text-15 border border-rule-strong rounded px-2 bg-surface text-ink"
            value={rucheRattachee?.id ?? ''}
            onChange={(e) => changerRattachement(e.target.value || null)}
          >
            <option value="">Aucune (répartie par clé)</option>
            {ruches
              .filter((r) => !r.immobilisation_id || r.id === rucheRattachee?.id)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  Ruche {r.numero}
                </option>
              ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-13 text-ink-secondary mb-1 block" htmlFor="date-sortie">
              Date de sortie
            </label>
            <input
              id="date-sortie"
              type="date"
              className="w-full h-11 text-15 border border-rule-strong rounded px-2 bg-surface text-ink"
              value={dateSortie}
              onChange={(e) => setDateSortie(e.target.value)}
            />
          </div>
          <button type="button" onClick={enregistrerSortie} className="h-11 px-3 rounded bg-ink text-surface text-13 font-bold">
            Enregistrer
          </button>
        </div>

        <div className="overflow-x-auto bg-surface rounded border border-rule">
          <table className="w-full text-13 border-collapse">
            <thead>
              <tr className="border-b border-rule">
                <th className="text-left p-2 font-bold">Exercice</th>
                <th className="text-right p-2 font-bold">Dotation</th>
                <th className="text-left p-2 font-bold">Clé de répartition</th>
              </tr>
            </thead>
            <tbody>
              {dotations.map((d) => (
                <tr key={d.id} className="border-b border-rule last:border-0">
                  <td className="p-2 font-mono">{d.exercice}-{d.exercice + 1}</td>
                  <td className="text-right p-2 font-mono font-bold">{d.dotation.toFixed(2)} €</td>
                  <td className="p-2">
                    {rucheRattachee ? (
                      <span className="text-ink-secondary">— (rattachement direct)</span>
                    ) : (
                      <select
                        className="h-9 text-13 border border-rule-strong rounded px-2 bg-surface text-ink"
                        value={d.cle_repartition}
                        onChange={(e) => changerCle(d.exercice, e.target.value)}
                      >
                        {Object.entries(CLE_LIBELLES).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
