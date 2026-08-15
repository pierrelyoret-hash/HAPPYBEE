import { useEffect, useState } from 'react';
import { listerRuchers } from '../../db/repositories/ruchers.js';
import { compterRuchesActivesParRucher } from '../../db/repositories/ruches.js';
import { exporterDonnees, compterEnregistrements } from '../../db/repositories/sauvegarde.js';
import { listerEvenementsExportConsolide } from '../../db/repositories/historiqueConsolide.js';
import {
  declencherTelechargementJson,
  declencherTelechargementCsv,
} from '../../lib/telechargement.js';
import { genererCsvConsolide } from '../../lib/exportCsvConsolide.js';
import { surSync } from '../../lib/sync.js';

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
}) {
  const [ruchers, setRuchers] = useState(null);
  const [nbRuchesParRucher, setNbRuchesParRucher] = useState(new Map());
  const [messageSauvegarde, setMessageSauvegarde] = useState(null);

  async function charger() {
    const liste = await listerRuchers();
    setRuchers(liste);
    setNbRuchesParRucher(await compterRuchesActivesParRucher(liste.map((r) => r.id)));
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

  if (ruchers === null) return null;

  return (
    <div className="min-h-screen bg-ground text-ink p-4 flex flex-col gap-4 max-w-md mx-auto">
      <header>
        <h1 className="text-20 font-bold">HAPPYBEE</h1>
      </header>

      <section className="flex flex-col gap-2">
        <p className="text-13 text-ink-secondary">Ruchers</p>
        {ruchers.length === 0 && (
          <p className="text-13 text-ink-secondary">Aucun rucher pour l'instant.</p>
        )}
        <ul className="bg-surface rounded border border-rule divide-y divide-rule">
          {ruchers.map((rucher) => (
            <li key={rucher.id}>
              <button
                type="button"
                onClick={() => onOuvrirRucher(rucher.id)}
                className="w-full text-left p-3 flex items-center justify-between gap-2"
              >
                <span>
                  <span className="block text-15 font-bold">{rucher.nom}</span>
                  <span className="block text-12 text-ink-secondary">
                    {rucher.commune ? `${rucher.commune} · ` : ''}
                    {nbRuchesParRucher.get(rucher.id) ?? 0} ruche(s)
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
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
        {/* Économique (M6) : module planifié, pas encore construit — la
            place lui est réservée ici plutôt que d'attendre que tout soit
            prêt pour toucher à cet écran. */}
        <button
          type="button"
          disabled
          className="h-16 rounded bg-surface-sunk border border-rule text-ink-muted text-13 font-bold flex flex-col items-center justify-center text-center px-2 cursor-not-allowed"
        >
          Économique
          <span className="text-11 font-normal">à venir</span>
        </button>
        <button
          type="button"
          onClick={onOuvrirMeteo}
          className="h-16 rounded bg-miel text-ink text-13 font-bold flex items-center justify-center text-center px-2"
        >
          Météo
        </button>
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
  );
}
