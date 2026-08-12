import { useState } from 'react';
import { db } from '../../db/db.js';
import { obtenirPremierRucher } from '../../db/repositories/ruchers.js';
import { listerColoniesActives } from '../../db/repositories/colonies.js';
import { importerEnregistrements } from '../../db/repositories/import.js';
import { parserArchivesCsv, resoudreLignes } from '../../lib/csv.js';

const CORRESPONDANCE_COLONNES = [
  ['Date', 'visite.date'],
  ['Heure', 'visite.heure'],
  ['Ruche', 'colonie ciblée (numéro de ruche, ou toutes)'],
  ['Type', 'visite.type'],
  ['Observation', 'visite.observation_libre'],
  ['Contexte climatique', 'visite.observation_libre'],
  ['Action entreprise', 'visite.action_entreprise'],
  ['Résultat/Suivi', 'visite.observation_libre'],
  ['Priorité', 'visite.priorite / tache.priorite'],
  ['Échéance', 'tache.date_echeance (si renseignée)'],
  ['Notes', 'visite.observation_libre'],
];

export function ImportCsv({ onRetour }) {
  const [analyse, setAnalyse] = useState(null);
  const [modeToutes, setModeToutes] = useState('dupliquer');
  const [resume, setResume] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  async function lireFichier(fichier) {
    setErreur(null);
    setResume(null);
    try {
      const texte = await fichier.text();
      setAnalyse(parserArchivesCsv(texte));
    } catch (err) {
      console.error('[import CSV] échec de lecture', err);
      setErreur("Le fichier n'a pas pu être lu.");
    }
  }

  function surChangementFichier(e) {
    const fichier = e.target.files?.[0];
    if (fichier) lireFichier(fichier);
  }

  async function validerImport() {
    setEnCours(true);
    setErreur(null);
    try {
      const rucher = await obtenirPremierRucher();
      const ruches = await db.ruche.toArray();
      const colonies = (await listerColoniesActives()).map((c) => c.colonie);

      const { enregistrements, erreursResolution } = resoudreLignes(analyse.lignesValides, {
        rucher,
        ruches,
        colonies,
        modeToutes,
      });

      const resultat = await importerEnregistrements(enregistrements);
      setResume({ ...resultat, erreursResolution });
    } catch (err) {
      console.error("[import CSV] échec de l'import", err);
      setErreur("L'import a échoué.");
    } finally {
      setEnCours(false);
    }
  }

  const contientToutes = analyse?.lignesValides.some((l) => l.ruche === 'Toutes');

  return (
    <div className="min-h-screen bg-ground text-ink p-4 flex flex-col gap-4 max-w-md mx-auto">
      <header>
        <h1 className="text-20 font-bold">Importer l'historique</h1>
        <p className="text-13 text-ink-secondary">Fichier archives_apicoles.csv</p>
      </header>

      {!analyse && (
        <label className="border border-dashed border-rule-strong rounded p-4 text-center text-13 text-ink-secondary block">
          <input type="file" accept=".csv" className="hidden" onChange={surChangementFichier} />
          Choisir le fichier CSV
        </label>
      )}

      {erreur && <p className="text-13 text-urgent-ink">{erreur}</p>}

      {analyse && !resume && (
        <>
          <section className="text-13">
            <p>
              {analyse.lignesValides.length} ligne(s) lue(s), {analyse.lignesErreur.length} en
              erreur.
            </p>
          </section>

          {analyse.lignesErreur.length > 0 && (
            <section>
              <p className="text-13 text-ink-secondary mb-1">Lignes en erreur</p>
              <ul className="text-11 text-urgent-ink flex flex-col gap-1">
                {analyse.lignesErreur.map((e) => (
                  <li key={e.numeroLigne}>
                    Ligne {e.numeroLigne} : {e.motif}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <p className="text-13 text-ink-secondary mb-1">Correspondance des colonnes</p>
            <ul className="text-11 text-ink-secondary flex flex-col gap-0.5">
              {CORRESPONDANCE_COLONNES.map(([source, cible]) => (
                <li key={source}>
                  {source} → {cible}
                </li>
              ))}
            </ul>
          </section>

          {contientToutes && (
            <section>
              <p className="text-13 text-ink-secondary mb-1">
                Certaines lignes concernent « Toutes » les ruches. Comment les traiter ?
              </p>
              <label className="flex items-start gap-2 text-13 mb-2">
                <input
                  type="radio"
                  name="mode-toutes"
                  className="mt-1"
                  checked={modeToutes === 'dupliquer'}
                  onChange={() => setModeToutes('dupliquer')}
                />
                <span>
                  Dupliquer sur chaque colonie active (recommandé — conserve tout le texte sur
                  chaque colonie)
                </span>
              </label>
              <label className="flex items-start gap-2 text-13">
                <input
                  type="radio"
                  name="mode-toutes"
                  className="mt-1"
                  checked={modeToutes === 'tache_rucher'}
                  onChange={() => setModeToutes('tache_rucher')}
                />
                <span>
                  Créer une tâche de niveau rucher (uniquement si une échéance est renseignée —
                  le texte n'est pas conservé intégralement)
                </span>
              </label>
            </section>
          )}

          <button
            type="button"
            onClick={validerImport}
            disabled={enCours}
            className="h-[46px] w-full rounded bg-ink text-surface text-15 font-bold disabled:opacity-50"
          >
            {enCours ? 'Import en cours…' : "Valider l'import"}
          </button>
        </>
      )}

      {resume && (
        <section className="text-13">
          <p>
            {resume.nbVisites} visite(s) et {resume.nbTaches} tâche(s) importée(s).
          </p>
          {resume.erreursResolution.length > 0 && (
            <>
              <p className="text-ink-secondary mt-2 mb-1">Lignes ignorées</p>
              <ul className="text-11 text-urgent-ink flex flex-col gap-1">
                {resume.erreursResolution.map((e, i) => (
                  <li key={i}>
                    Ligne {e.numeroLigne} : {e.motif}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {onRetour && (
        <button
          type="button"
          onClick={onRetour}
          className="h-12 w-full text-13 text-ink-secondary underline"
        >
          Retour à la vue d'ensemble
        </button>
      )}
    </div>
  );
}
