import { useEffect, useState } from 'react';
import { PastilleEtat } from '../../components/PastilleEtat.jsx';
import { db } from '../../db/db.js';
import {
  obtenirPremierRucher,
  mettreAJourOrdreTournee,
} from '../../db/repositories/ruchers.js';
import { obtenirDerniereVisite } from '../../db/repositories/visites.js';
import { listerTachesOuvertesRucher } from '../../db/repositories/taches.js';
import { calculerEtat, joursDepuis } from '../../lib/etats.js';

function useHorsLigne() {
  const [horsLigne, setHorsLigne] = useState(!navigator.onLine);
  useEffect(() => {
    const majEtat = () => setHorsLigne(!navigator.onLine);
    window.addEventListener('online', majEtat);
    window.addEventListener('offline', majEtat);
    return () => {
      window.removeEventListener('online', majEtat);
      window.removeEventListener('offline', majEtat);
    };
  }, []);
  return horsLigne;
}

function dateLisible(iso) {
  return new Date(iso).toLocaleDateString('fr-FR');
}

function sommeCadresObserves(visite) {
  if (!visite) return null;
  const valeurs = [
    visite.nb_cadres_couvain_opercule,
    visite.nb_cadres_couvain_ouvert,
    visite.nb_cadres_provisions,
  ].filter((v) => v != null);
  if (valeurs.length === 0) return null;
  return valeurs.reduce((a, b) => a + b, 0);
}

export function VueEnsemble({ onOuvrirVisite, onOuvrirHistorique }) {
  const [rucher, setRucher] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const horsLigne = useHorsLigne();

  async function charger() {
    const r = await obtenirPremierRucher();
    if (!r) {
      setRucher(null);
      setLignes([]);
      setChargement(false);
      return;
    }
    setRucher(r);

    const ordre = r.ordre_tournee ?? [];
    const ruches = await db.ruche.bulkGet(ordre);
    const colonies = await db.colonie
      .where('ruche_id')
      .anyOf(ordre)
      .and((c) => c.statut === 'active' && !c.deleted_at)
      .toArray();
    const colonieParRuche = new Map(colonies.map((c) => [c.ruche_id, c]));
    const tachesOuvertes = await listerTachesOuvertesRucher(r.id);

    const donnees = await Promise.all(
      ordre.map(async (rucheId, index) => {
        const ruche = ruches[index];
        const colonie = colonieParRuche.get(rucheId);
        if (!ruche || !colonie) return null;

        const reine = await db.reine
          .where('colonie_id')
          .equals(colonie.id)
          .and((r2) => !r2.deleted_at)
          .first();

        const derniereVisite = await obtenirDerniereVisite(colonie.id);

        const tachesColonie = tachesOuvertes.filter(
          (t) => t.colonie_id === colonie.id || (t.colonie_id == null && t.rucher_id === r.id)
        );

        const joursDepuisVisite = derniereVisite ? joursDepuis(derniereVisite.date) : null;
        const etat = calculerEtat({ tachesOuvertes: tachesColonie, joursDepuisVisite });

        return {
          ruche,
          colonie,
          reine,
          etat,
          joursDepuisVisite,
          cadresObserves: sommeCadresObserves(derniereVisite),
          tachesUrgentes: tachesColonie.filter(
            (t) => t.date_echeance && new Date(t.date_echeance).getTime() <= Date.now()
          ),
        };
      })
    );

    setLignes(donnees.filter(Boolean));
    setChargement(false);
  }

  useEffect(() => {
    charger();
  }, []);

  async function deplacer(index, direction) {
    const nouvelOrdre = [...rucher.ordre_tournee];
    const cible = index + direction;
    if (cible < 0 || cible >= nouvelOrdre.length) return;
    [nouvelOrdre[index], nouvelOrdre[cible]] = [nouvelOrdre[cible], nouvelOrdre[index]];
    await mettreAJourOrdreTournee(rucher.id, nouvelOrdre);
    await charger();
  }

  if (chargement) return null;

  if (!rucher) {
    return <p className="p-4 text-base text-gray-600">Aucun rucher trouvé.</p>;
  }

  const urgences = lignes.filter((l) => l.etat === 'urgent');

  return (
    <div className="min-h-screen bg-white text-gray-900 p-4 flex flex-col gap-4 max-w-md mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-medium">{rucher.nom}</h1>
        {horsLigne && (
          <span className="text-[11px] text-gray-500 border border-gray-300 rounded px-2 py-1">
            Hors ligne
          </span>
        )}
      </header>

      {urgences.length > 0 && (
        <section className="flex flex-col gap-2">
          {urgences.map((ligne) => (
            <button
              key={ligne.colonie.id}
              type="button"
              onClick={() => onOuvrirVisite(ligne.colonie.id)}
              className="text-left border border-red-300 bg-red-50 rounded p-3"
            >
              <p className="text-sm font-medium text-red-700">
                ! Ruche {ligne.ruche.numero} — {ligne.tachesUrgentes[0]?.libelle ?? 'échéance dépassée'}
              </p>
              <p className="text-[11px] text-red-600">
                Échéance : {dateLisible(ligne.tachesUrgentes[0]?.date_echeance)}
              </p>
            </button>
          ))}
        </section>
      )}

      <button
        type="button"
        onClick={() => onOuvrirVisite(null)}
        className="h-[46px] w-full rounded bg-blue-600 text-white text-base font-medium"
      >
        Saisir une visite
      </button>

      <section>
        <p className="text-sm text-gray-600 mb-2">Ordre de tournée</p>
        <ul className="flex flex-col gap-2">
          {lignes.map((ligne, index) => (
            <li
              key={ligne.colonie.id}
              className="border border-gray-200 rounded p-3 flex items-center gap-3"
            >
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => deplacer(index, -1)}
                  disabled={index === 0}
                  className="w-8 h-8 rounded bg-gray-100 disabled:opacity-30"
                  aria-label="monter dans la tournée"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => deplacer(index, 1)}
                  disabled={index === lignes.length - 1}
                  className="w-8 h-8 rounded bg-gray-100 disabled:opacity-30"
                  aria-label="descendre dans la tournée"
                >
                  ↓
                </button>
              </div>

              <div className="flex-1">
                <button
                  type="button"
                  onClick={() => onOuvrirVisite(ligne.colonie.id)}
                  className="text-left w-full"
                >
                  <p className="text-base font-medium">
                    Ruche {ligne.ruche.numero}
                    <span className="text-sm font-normal text-gray-600">
                      {' · '}
                      {ligne.reine ? `reine ${ligne.reine.annee_naissance}` : 'reine non confirmée'}
                      {ligne.cadresObserves != null && ` · ${ligne.cadresObserves} cadres`}
                    </span>
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {ligne.joursDepuisVisite == null
                      ? 'Jamais visitée'
                      : ligne.joursDepuisVisite === 0
                        ? "Visitée aujourd'hui"
                        : `Visitée il y a ${ligne.joursDepuisVisite} j`}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onOuvrirHistorique(ligne.colonie.id)}
                  className="text-[11px] text-blue-700 underline mt-1"
                >
                  Historique
                </button>
              </div>

              <PastilleEtat etat={ligne.etat} />
            </li>
          ))}
        </ul>
      </section>

      <footer>
        <p className="text-sm text-gray-600 mb-1">Légende</p>
        <div className="flex flex-wrap gap-2">
          <PastilleEtat etat="urgent" />
          <PastilleEtat etat="action" />
          <PastilleEtat etat="a_visiter" />
          <PastilleEtat etat="normale" />
        </div>
      </footer>
    </div>
  );
}
