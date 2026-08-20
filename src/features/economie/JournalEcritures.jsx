import { useEffect, useState } from 'react';
import { EnTeteEcran } from '../../components/EnTeteEcran.jsx';
import { obtenirSaison } from '../../lib/saison.js';
import { listerEcritures, listerCategories, listerExercicesConnus, supprimerEcriture } from '../../db/repositories/economie.js';
import { listerRuchers } from '../../db/repositories/ruchers.js';

const SENS_LIBELLES = { depense: 'Dépense', produit: 'Produit' };

function formaterMontant(montant, sens) {
  const signe = sens === 'depense' ? '−' : '+';
  return `${signe} ${Math.abs(montant).toFixed(2)} €`;
}

// Registre filtrable (brief §7) — lignes réglées, montants en chiffres
// tabulaires, comme l'historique existant (src/features/historique).
export function JournalEcritures({ onOuvrirSaisie, onRetour }) {
  const [ecritures, setEcritures] = useState([]);
  const [categories, setCategories] = useState([]);
  const [ruchers, setRuchers] = useState([]);
  const [exercices, setExercices] = useState([]);

  const [exercice, setExercice] = useState(() => obtenirSaison(new Date().toISOString().slice(0, 10)).debut);
  const [sens, setSens] = useState('');
  const [categorieId, setCategorieId] = useState('');
  const [rucherId, setRucherId] = useState('');

  async function charger() {
    setCategories(await listerCategories());
    setRuchers(await listerRuchers());
    const connus = await listerExercicesConnus();
    setExercices(connus);
    setEcritures(
      await listerEcritures({
        exercice: exercice === '' ? null : Number(exercice),
        sens: sens || null,
        categorieId: categorieId || null,
        rucherId: rucherId || null,
      })
    );
  }

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercice, sens, categorieId, rucherId]);

  async function supprimer(id) {
    await supprimerEcriture(id);
    await charger();
  }

  const categorieParId = new Map(categories.map((c) => [c.id, c]));

  return (
    <div className="min-h-screen bg-ground text-ink flex flex-col max-w-4xl mx-auto">
      <EnTeteEcran
        retourLibelle="← Retour"
        onRetour={onRetour}
        titre="Journal des écritures"
        droite={
          <button type="button" onClick={onOuvrirSaisie} className="h-11 px-3 rounded bg-ink text-surface text-13 font-bold">
            + Écriture
          </button>
        }
      />

      <div className="p-4 flex flex-col gap-4">
        <div className="flex gap-2 flex-wrap">
          <select className="h-10 text-13 border border-rule-strong rounded px-2 bg-surface text-ink" value={exercice} onChange={(e) => setExercice(e.target.value)}>
            <option value="">Tous les exercices</option>
            {exercices.map((ex) => (
              <option key={ex} value={ex}>
                {ex}-{ex + 1}
              </option>
            ))}
          </select>
          <select className="h-10 text-13 border border-rule-strong rounded px-2 bg-surface text-ink" value={sens} onChange={(e) => setSens(e.target.value)}>
            <option value="">Dépenses et produits</option>
            <option value="depense">Dépenses</option>
            <option value="produit">Produits</option>
          </select>
          <select className="h-10 text-13 border border-rule-strong rounded px-2 bg-surface text-ink" value={categorieId} onChange={(e) => setCategorieId(e.target.value)}>
            <option value="">Toutes catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.libelle}
              </option>
            ))}
          </select>
          <select className="h-10 text-13 border border-rule-strong rounded px-2 bg-surface text-ink" value={rucherId} onChange={(e) => setRucherId(e.target.value)}>
            <option value="">Tous ruchers</option>
            {ruchers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nom}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto bg-surface rounded border border-rule">
          <table className="w-full text-13 border-collapse">
            <thead>
              <tr className="border-b border-rule">
                <th className="text-left p-2 font-bold">Date</th>
                <th className="text-left p-2 font-bold">Libellé</th>
                <th className="text-left p-2 font-bold">Catégorie</th>
                <th className="text-left p-2 font-bold">Niveau</th>
                <th className="text-right p-2 font-bold">Montant</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {ecritures.map((e) => (
                <tr key={e.id} className="border-b border-rule last:border-0">
                  <td className="p-2 font-mono whitespace-nowrap">{e.date}</td>
                  <td className="p-2">{e.libelle || '—'}</td>
                  <td className="p-2">{categorieParId.get(e.categorie_id)?.libelle ?? '—'}</td>
                  <td className="p-2">{e.niveau_affectation}</td>
                  <td className={`text-right p-2 font-mono font-bold ${e.sens === 'depense' ? 'text-urgent-ink' : 'text-vert'}`}>
                    {formaterMontant(e.montant, e.sens)}
                  </td>
                  <td className="p-2 text-right">
                    <button type="button" onClick={() => supprimer(e.id)} className="text-11 text-ink-secondary underline">
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
              {ecritures.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-13 text-ink-secondary">
                    Aucune écriture.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
