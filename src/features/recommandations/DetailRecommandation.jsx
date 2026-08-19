import { useEffect, useState } from 'react';
import { EnTeteEcran } from '../../components/EnTeteEcran.jsx';
import { Chips } from '../../components/Chips.jsx';
import {
  obtenirRecommandation,
  validerRecommandation,
  differerRecommandation,
  rejeterRecommandation,
} from '../../db/repositories/recommandations.js';
import { obtenirRegle } from '../../db/repositories/regles.js';

const CHAMP_CLASSE = 'w-full h-11 text-15 border border-rule-strong rounded px-2 bg-surface text-ink';

// M12 §8.4 (§7 du brief) : garde-fous et sources ne sont JAMAIS repliés
// dans un second écran — affichés ici même, indissociables de l'énoncé.
export function DetailRecommandation({ recommandationId, onRetour, onTraitee }) {
  const [recommandation, setRecommandation] = useState(null);
  const [regle, setRegle] = useState(null);
  // Une seule action proposée dans la grande majorité des règles : toutes
  // pré-cochées par défaut, l'exploitant décoche ce qu'il ne veut pas —
  // pour R-ORPH-01 (plusieurs conduites concurrentes), ça évite de forcer
  // un premier clic juste pour tout sélectionner.
  const [actionsChoisies, setActionsChoisies] = useState([]);
  const [modeDiffere, setModeDiffere] = useState(false);
  const [dateDiffere, setDateDiffere] = useState('');
  const [modeRejet, setModeRejet] = useState(false);
  const [motifRejet, setMotifRejet] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    obtenirRecommandation(recommandationId).then(async (reco) => {
      setRecommandation(reco);
      if (reco) {
        const r = await obtenirRegle(reco.regle_code);
        setRegle(r);
        setActionsChoisies(r?.actions_proposees ?? []);
      }
    });
  }, [recommandationId]);

  async function valider() {
    try {
      await validerRecommandation(recommandationId, { actionsChoisies });
      onTraitee?.();
    } catch (err) {
      console.error('[recommandation] échec validation', err);
      setMessage("Erreur : la validation n'a pas pu être enregistrée.");
    }
  }

  async function confirmerDiffere() {
    if (!dateDiffere) return;
    await differerRecommandation(recommandationId, new Date(dateDiffere).toISOString());
    onTraitee?.();
  }

  async function confirmerRejet() {
    // Motif facultatif (§7, rappel transverse) : un rejet non motivé reste
    // un rejet.
    await rejeterRecommandation(recommandationId, motifRejet || null);
    onTraitee?.();
  }

  if (recommandation === null) return null;

  const actionsProposees = regle?.actions_proposees ?? [];
  const plusieursActions = actionsProposees.length > 1;

  return (
    <div className="min-h-screen bg-ground text-ink flex flex-col max-w-md mx-auto pb-14">
      <EnTeteEcran retourLibelle="← Retour" onRetour={onRetour} titre="Recommandation" />

      <div className="p-4 flex flex-col gap-4">
        <section>
          <p className="text-15 font-bold text-ink">{recommandation.enonce}</p>
          <p className="text-11 text-ink-muted mt-1">{recommandation.regle_code} · v{recommandation.regle_version}</p>
        </section>

        <section>
          <p className="text-13 font-bold text-ink-secondary mb-1">Pourquoi</p>
          <p className="text-14 text-ink">{recommandation.justification}</p>
        </section>

        {recommandation.donnees_declenchement && (
          <section>
            <p className="text-13 font-bold text-ink-secondary mb-1">Données au déclenchement</p>
            <ul className="text-13 text-ink-secondary font-mono bg-surface-sunk rounded p-2 flex flex-col gap-0.5">
              {Object.entries(recommandation.donnees_declenchement)
                .filter(([cle]) => !['jourMeteo'].includes(cle))
                .map(([cle, valeur]) => (
                  <li key={cle}>
                    {cle} : {typeof valeur === 'object' ? JSON.stringify(valeur) : String(valeur)}
                  </li>
                ))}
            </ul>
          </section>
        )}

        {recommandation.garde_fous?.length > 0 && (
          <section className="border border-rule-strong rounded p-3 bg-action-bg">
            <p className="text-13 font-bold text-action-ink mb-1">Garde-fous</p>
            <ul className="text-13 text-action-ink list-disc pl-4 flex flex-col gap-1">
              {recommandation.garde_fous.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </section>
        )}

        {recommandation.sources?.length > 0 && (
          <section>
            <p className="text-13 font-bold text-ink-secondary mb-1">Sources</p>
            <ul className="text-12 text-ink-muted list-disc pl-4">
              {recommandation.sources.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
        )}

        {recommandation.statut !== 'proposee' && (
          <p className="text-13 text-ink-secondary">
            Déjà traitée — statut : <strong>{recommandation.statut}</strong>
            {recommandation.motif_rejet && ` (motif : ${recommandation.motif_rejet})`}
          </p>
        )}

        {recommandation.statut === 'proposee' && !modeDiffere && !modeRejet && (
          <section className="flex flex-col gap-3 border-t border-rule pt-4">
            {plusieursActions && (
              <div>
                <p className="text-13 text-ink-secondary mb-1">
                  Action(s) à valider ({actionsChoisies.length}/{actionsProposees.length})
                </p>
                <Chips options={actionsProposees.map((a) => ({ value: a, label: a }))} value={actionsChoisies} onChange={setActionsChoisies} />
              </div>
            )}
            <button
              type="button"
              onClick={valider}
              disabled={plusieursActions && actionsChoisies.length === 0}
              className="h-[46px] w-full rounded bg-miel text-ink text-15 font-bold disabled:opacity-40"
            >
              Valider {plusieursActions ? `(${actionsChoisies.length})` : ''}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModeDiffere(true)}
                className="flex-1 h-11 rounded bg-surface border border-rule-strong text-ink text-14 font-bold"
              >
                Différer
              </button>
              <button
                type="button"
                onClick={() => setModeRejet(true)}
                className="flex-1 h-11 rounded bg-surface border border-rule-strong text-ink text-14 font-bold"
              >
                Rejeter
              </button>
            </div>
          </section>
        )}

        {modeDiffere && (
          <section className="flex flex-col gap-3 border-t border-rule pt-4">
            <label className="text-13 text-ink-secondary block" htmlFor="date_differe">
              Reprendre le
            </label>
            <input
              id="date_differe"
              type="date"
              className={CHAMP_CLASSE}
              value={dateDiffere}
              onChange={(e) => setDateDiffere(e.target.value)}
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setModeDiffere(false)} className="flex-1 h-11 rounded bg-surface border border-rule-strong text-ink text-14 font-bold">
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmerDiffere}
                disabled={!dateDiffere}
                className="flex-1 h-11 rounded bg-miel text-ink text-14 font-bold disabled:opacity-40"
              >
                Confirmer
              </button>
            </div>
          </section>
        )}

        {modeRejet && (
          <section className="flex flex-col gap-3 border-t border-rule pt-4">
            <label className="text-13 text-ink-secondary block" htmlFor="motif_rejet">
              Motif (facultatif)
            </label>
            <textarea
              id="motif_rejet"
              className="w-full border border-rule-strong rounded p-2 text-15 bg-surface text-ink"
              rows={2}
              value={motifRejet}
              onChange={(e) => setMotifRejet(e.target.value)}
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setModeRejet(false)} className="flex-1 h-11 rounded bg-surface border border-rule-strong text-ink text-14 font-bold">
                Annuler
              </button>
              <button type="button" onClick={confirmerRejet} className="flex-1 h-11 rounded bg-bordeaux text-surface text-14 font-bold">
                Confirmer le rejet
              </button>
            </div>
          </section>
        )}

        {message && <p className="text-13 text-center text-urgent-ink">{message}</p>}

        {onRetour && (
          <button type="button" onClick={onRetour} className="h-12 w-full text-13 text-ink-secondary underline">
            Retour
          </button>
        )}
      </div>
    </div>
  );
}
