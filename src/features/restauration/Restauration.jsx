import { useState } from 'react';
import { restaurerDonnees, compterEnregistrements } from '../../db/repositories/sauvegarde.js';

export function Restauration({ onRetour }) {
  const [fichierChoisi, setFichierChoisi] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [message, setMessage] = useState(null);
  const [enCours, setEnCours] = useState(false);

  async function surChoixFichier(e) {
    const fichier = e.target.files?.[0];
    setErreur(null);
    setMessage(null);
    setFichierChoisi(null);
    if (!fichier) return;
    try {
      const texte = await fichier.text();
      const donnees = JSON.parse(texte);
      if (!donnees.tables) throw new Error('champ "tables" manquant');
      setFichierChoisi(donnees);
    } catch (err) {
      console.error('[restauration] fichier invalide', err);
      setErreur("Ce fichier n'est pas une sauvegarde HAPPYBEE valide.");
    }
  }

  async function confirmerRestauration() {
    setEnCours(true);
    setErreur(null);
    try {
      const total = compterEnregistrements(fichierChoisi);
      await restaurerDonnees(fichierChoisi);
      setMessage(`Restauration terminée : ${total} enregistrement(s).`);
      setFichierChoisi(null);
    } catch (err) {
      console.error('[restauration] échec', err);
      setErreur("La restauration a échoué. Les données actuelles n'ont pas été modifiées.");
    } finally {
      setEnCours(false);
    }
  }

  function annuler() {
    setFichierChoisi(null);
  }

  return (
    <div className="min-h-screen bg-ground text-ink p-4 flex flex-col gap-4 max-w-md mx-auto">
      <header>
        <h1 className="text-20 font-bold">Restaurer une sauvegarde</h1>
        <p className="text-13 text-ink-secondary">Remplace toutes les données actuelles</p>
      </header>

      {!fichierChoisi && !message && (
        <label className="border border-dashed border-rule-strong rounded p-4 text-center text-13 text-ink-secondary block">
          <input type="file" accept=".json" className="hidden" onChange={surChoixFichier} />
          Choisir un fichier de sauvegarde
        </label>
      )}

      {erreur && <p className="text-13 text-urgent-ink">{erreur}</p>}

      {fichierChoisi && (
        <div className="border border-rule-strong bg-urgent-bg rounded p-3">
          <p className="text-13 text-urgent-ink font-bold">
            Cette restauration va remplacer toutes les données actuelles de l'application. Cette
            action est irréversible.
          </p>
          <p className="text-11 text-urgent-ink mt-1">
            {compterEnregistrements(fichierChoisi)} enregistrement(s) dans ce fichier
            {fichierChoisi.exporte_le &&
              `, exporté le ${new Date(fichierChoisi.exporte_le).toLocaleString('fr-FR')}`}
            .
          </p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={confirmerRestauration}
              disabled={enCours}
              className="h-12 flex-1 rounded bg-urgent-ink text-surface text-13 font-bold disabled:opacity-50"
            >
              {enCours ? 'Restauration…' : 'Confirmer le remplacement'}
            </button>
            <button
              type="button"
              onClick={annuler}
              disabled={enCours}
              className="h-12 flex-1 rounded bg-surface border border-rule-strong text-ink text-13 font-bold"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {message && <p className="text-13 text-normale-ink">{message}</p>}

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
