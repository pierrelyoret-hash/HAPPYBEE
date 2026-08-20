import { useEffect, useState } from 'react';
import { EnTeteEcran } from '../../components/EnTeteEcran.jsx';
import { listerRuchers } from '../../db/repositories/ruchers.js';
import { compterRuchesActivesParRucher } from '../../db/repositories/ruches.js';
import { listerColoniesActives } from '../../db/repositories/colonies.js';
import { obtenirDerniereVisite } from '../../db/repositories/visites.js';
import { listerToutesTachesOuvertes } from '../../db/repositories/taches.js';
import { listerRecommandationsEnAttente } from '../../db/repositories/recommandations.js';
import { exporterDonnees, compterEnregistrements } from '../../db/repositories/sauvegarde.js';
import { listerEvenementsExportConsolide } from '../../db/repositories/historiqueConsolide.js';
import {
  declencherTelechargementJson,
  declencherTelechargementCsv,
} from '../../lib/telechargement.js';
import { genererCsvConsolide } from '../../lib/exportCsvConsolide.js';
import { calculerEtat, joursDepuis } from '../../lib/etats.js';
import { surSync } from '../../lib/sync.js';

// Semaine ISO 8601 (lundi = début, la semaine 1 contient le premier jeudi
// de l'année) — pour le contexte du bandeau (refonte visuelle, étape 1).
function numeroSemaineIso(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const jourSemaine = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - jourSemaine);
  const debutAnnee = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - debutAnnee) / 86400000 + 1) / 7);
}

function contexteAccueil() {
  const maintenant = new Date();
  const jour = maintenant.getDate();
  const mois = maintenant.toLocaleDateString('fr-FR', { month: 'long' }).toUpperCase();
  return `${jour} ${mois} · SEM. ${numeroSemaineIso(maintenant)}`;
}

// Trois chiffres de saison (refonte visuelle, étape 3bis — version atténuée
// du bandeau 1b : 26px tabulaire, pas les 40px "héros" que le brief exclut
// explicitement pour ce genre de statistique globale). Calcul en lecture
// seule à l'affichage, aucune tâche créée ici (contrairement à VueEnsemble,
// qui génère la tâche "pas de visite depuis 21 jours" à l'ouverture d'un
// rucher) — cet écran ne fait qu'agréger l'existant.
async function calculerStatsSaison() {
  const coloniesActives = await listerColoniesActives();
  const tachesOuvertes = await listerToutesTachesOuvertes();

  const parColonie = await Promise.all(
    coloniesActives.map(async ({ colonie, rucher }) => {
      const derniereVisite = await obtenirDerniereVisite(colonie.id);
      const joursDepuisVisite = derniereVisite ? joursDepuis(derniereVisite.date) : null;
      const tachesColonie = tachesOuvertes.filter(
        (t) => t.colonie_id === colonie.id || (t.colonie_id == null && t.rucher_id === rucher.id)
      );
      const etat = calculerEtat({ tachesOuvertes: tachesColonie, joursDepuisVisite });
      return {
        rucherId: rucher.id,
        etat,
        joursDepuisVisite,
        couvain: derniereVisite?.nb_cadres_couvain_opercule ?? 0,
      };
    })
  );

  const joursConnus = parColonie.map((c) => c.joursDepuisVisite).filter((j) => j != null);

  const parRucher = new Map();
  for (const c of parColonie) {
    if (!parRucher.has(c.rucherId)) parRucher.set(c.rucherId, []);
    parRucher.get(c.rucherId).push(c);
  }

  return {
    totalColonies: parColonie.length,
    joursDepuisTournee: joursConnus.length > 0 ? Math.min(...joursConnus) : null,
    totalUrgents: parColonie.filter((c) => c.etat === 'urgent').length,
    parRucher,
  };
}

// Écran de lancement (retour d'usage réel du 14/08/2026, F1.1 jamais
// construit malgré L1 : jusqu'ici un seul rucher, saisi une fois pour
// toutes dans db/seed.js — aucun écran ne permettait d'en créer un
// second). Remplace VueEnsemble comme écran d'ouverture ; celui-ci
// s'ouvre maintenant après avoir choisi un rucher ici.
export function Accueil({
  onOuvrirRucher,
  onOuvrirSaisieRucher,
  onOuvrirRestauration,
  onOuvrirExportSanitairePdf,
  onOuvrirTaches,
  onOuvrirMeteo,
  onOuvrirFilTournee,
  onOuvrirRecommandations,
  onOuvrirEconomique,
}) {
  const [ruchers, setRuchers] = useState(null);
  const [nbRuchesParRucher, setNbRuchesParRucher] = useState(new Map());
  const [stats, setStats] = useState(null);
  const [messageSauvegarde, setMessageSauvegarde] = useState(null);
  // L3bis F12.2 : à côté du bloc "Tâches" existant, jamais à sa place —
  // une recommandation n'est pas une tâche tant qu'elle n'est pas validée.
  const [nbRecommandationsEnAttente, setNbRecommandationsEnAttente] = useState(0);

  async function charger() {
    const liste = await listerRuchers();
    setRuchers(liste);
    setNbRuchesParRucher(await compterRuchesActivesParRucher(liste.map((r) => r.id)));
    setStats(await calculerStatsSaison());
    setNbRecommandationsEnAttente((await listerRecommandationsEnAttente()).length);
  }

  useEffect(() => {
    charger();
    return surSync(charger);
  }, []);

  async function sauvegarder() {
    try {
      const donnees = await exporterDonnees();
      declencherTelechargementJson(
        `happybee-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`,
        donnees
      );
      setMessageSauvegarde(`Fichier téléchargé (${compterEnregistrements(donnees)} enregistrement(s)).`);
    } catch (err) {
      console.error('[sauvegarde] échec export', err);
      setMessageSauvegarde("Échec de l'export.");
    }
  }

  async function exporterHistoriqueConsolide() {
    try {
      const evenements = await listerEvenementsExportConsolide();
      const csv = genererCsvConsolide(evenements);
      declencherTelechargementCsv(
        `happybee-historique-${new Date().toISOString().slice(0, 10)}.csv`,
        csv
      );
      setMessageSauvegarde(`Historique exporté (${evenements.length} événement(s)).`);
    } catch (err) {
      console.error('[export consolidé] échec', err);
      setMessageSauvegarde("Échec de l'export de l'historique.");
    }
  }

  if (ruchers === null || stats === null) return null;

  return (
    <div className="min-h-screen bg-ground text-ink flex flex-col max-w-md mx-auto pb-14">
      <EnTeteEcran
        titre={<span className="font-mono text-13 font-bold tracking-[0.14em]">HAPPYBEE</span>}
        contexte={contexteAccueil()}
      >
        <div className="flex items-end gap-4">
          <div>
            <div className="font-mono text-26 font-bold leading-none text-ink">{stats.totalColonies}</div>
            <div className="text-11 text-sur-miel">colonie{stats.totalColonies > 1 ? 's' : ''}</div>
          </div>
          <div className="w-px h-[38px] bg-[rgba(26,26,23,0.25)]" />
          <div>
            <div className="font-mono text-26 font-bold leading-none text-ink">
              {stats.joursDepuisTournee ?? '—'}
            </div>
            <div className="text-11 text-sur-miel">jours depuis la dernière visite</div>
          </div>
          <div className="w-px h-[38px] bg-[rgba(26,26,23,0.25)]" />
          <div>
            <div className="font-mono text-26 font-bold leading-none text-urgent-ink">
              {stats.totalUrgents}
            </div>
            <div className="text-11 text-sur-miel">urgent{stats.totalUrgents > 1 ? 's' : ''}</div>
          </div>
        </div>
      </EnTeteEcran>

      <div className="p-4 flex flex-col gap-4">
        <section className="flex flex-col gap-2">
          <p className="text-13 text-ink-secondary">Ruchers</p>
          {ruchers.length === 0 && (
            <p className="text-13 text-ink-secondary">Aucun rucher pour l'instant.</p>
          )}
          <div className="flex flex-col gap-2">
            {ruchers.map((rucher) => {
              const statsRucher = stats.parRucher.get(rucher.id) ?? [];
              const urgents = statsRucher.filter((c) => c.etat === 'urgent').length;
              const couvainTotal = statsRucher.reduce((somme, c) => somme + c.couvain, 0);
              const joursConnus = statsRucher.map((c) => c.joursDepuisVisite).filter((j) => j != null);
              const vueIlYA = joursConnus.length > 0 ? Math.min(...joursConnus) : null;
              const nbRuches = nbRuchesParRucher.get(rucher.id) ?? 0;
              return (
                <div
                  key={rucher.id}
                  className="bg-surface border border-rule rounded p-3"
                  style={{ borderLeft: '4px solid var(--vert)' }}
                >
                  <button
                    type="button"
                    onClick={() => onOuvrirRucher(rucher.id)}
                    className="w-full text-left"
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-15 font-bold text-ink">{rucher.nom}</span>
                      {urgents > 0 ? (
                        <span className="text-11 font-bold bg-urgent-bg text-urgent-ink rounded px-1.5 py-0.5 shrink-0">
                          ! {urgents} urgent{urgents > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-11 font-bold bg-normale-bg text-normale-ink rounded px-1.5 py-0.5 shrink-0">
                          à jour
                        </span>
                      )}
                    </span>
                    <span className="block font-mono text-12 text-ink-secondary">
                      {nbRuches} ruche(s) · {couvainTotal} cadres couvain ·{' '}
                      {vueIlYA == null ? 'jamais visité' : vueIlYA === 0 ? "vu aujourd'hui" : `vu il y a ${vueIlYA} j`}
                    </span>
                  </button>
                  {onOuvrirFilTournee && nbRuches > 0 && (
                    <button
                      type="button"
                      onClick={() => onOuvrirFilTournee(rucher.id)}
                      className="mt-2 text-13 font-bold text-vert underline"
                    >
                      → Commencer la tournée
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => onOuvrirSaisieRucher(null)}
            className="h-11 w-full rounded bg-miel text-ink text-15 font-bold"
          >
            + Nouveau rucher
          </button>
        </section>

        <section className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOuvrirTaches}
            className="h-16 rounded bg-vert text-surface text-13 font-bold flex items-center justify-center text-center px-2"
          >
            Tâches
          </button>
          {/* Économique (M6/L4) — point d'entrée tranché le 18/08/2026
              (cadrage_ux_L4_economique.md §6.3) : la tuile plutôt qu'un
              onglet, la barre d'onglets étant la navigation du terrain. */}
          <button
            type="button"
            onClick={onOuvrirEconomique}
            className="h-16 rounded bg-surface border border-rule-strong text-ink text-13 font-bold flex items-center justify-center text-center px-2"
          >
            Économique
          </button>
          <button
            type="button"
            onClick={onOuvrirMeteo}
            className="h-16 rounded bg-miel text-ink text-13 font-bold flex items-center justify-center text-center px-2"
          >
            Météo
          </button>
          {onOuvrirRecommandations && (
            <button
              type="button"
              onClick={onOuvrirRecommandations}
              className="h-16 rounded bg-bordeaux text-surface text-13 font-bold flex flex-col items-center justify-center text-center px-2 gap-0.5"
            >
              Recommandations
              {nbRecommandationsEnAttente > 0 && (
                <span className="text-11 font-normal bg-surface text-bordeaux rounded px-1.5 py-0.5">
                  {nbRecommandationsEnAttente} en attente
                </span>
              )}
            </button>
          )}
        </section>

        <div className="flex flex-col gap-1 pt-2 border-t border-rule">
          <button type="button" onClick={sauvegarder} className="text-12 text-ink-secondary self-start">
            Sauvegarder (export JSON)
          </button>
          <button type="button" onClick={onOuvrirRestauration} className="text-12 text-ink-secondary self-start">
            Restaurer une sauvegarde
          </button>
          <button
            type="button"
            onClick={onOuvrirExportSanitairePdf}
            className="text-12 text-ink-secondary self-start"
          >
            Exporter le PDF sanitaire
          </button>
          <button
            type="button"
            onClick={exporterHistoriqueConsolide}
            className="text-12 text-ink-secondary self-start"
          >
            Exporter l'historique consolidé (CSV)
          </button>
          {messageSauvegarde && <p className="text-11 text-ink-muted">{messageSauvegarde}</p>}
        </div>
      </div>
    </div>
  );
}
