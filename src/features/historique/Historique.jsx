import { useEffect, useState } from 'react';
import { db } from '../../db/db.js';
import { listerVisitesColonie } from '../../db/repositories/visites.js';
import { surSync } from '../../lib/sync.js';

const ANOMALIE_LIBELLES = {
  bourdonneuse: 'Bourdonneuse',
  orpheline: 'Orpheline',
  pillage: 'Pillage',
  fausse_teigne: 'Fausse teigne',
  mortalite_anormale: 'Mortalité anormale',
  diarrhee: 'Diarrhée',
  abeilles_tremblantes: 'Abeilles noires tremblantes',
  ponte_males: 'Ponte de mâles',
  autre: 'Autre',
};

// Correction écrans L1 §7/§9.2 — ponte_qualite est retiré du schéma,
// score_ponte (0-5) est l'unique champ. Mêmes libellés qu'à la saisie.
const PONTE_ECHELLE_LIBELLES = {
  0: 'aucune ponte',
  1: 'très dispersée',
  2: 'lacunaire',
  3: 'correcte',
  4: 'compacte',
  5: 'très compacte',
};

const CELLULES_ROYALES_TYPE_LIBELLES = {
  essaimage: 'essaimage',
  supersedure: 'supersédure',
  sauvete: 'sauveté',
};

const SIGNES_SANITAIRES_LIBELLES = {
  couvain_mosaique: 'Couvain en mosaïque',
  opercules_affaisses: 'Opercules affaissés ou percés',
  larves_brunes_visqueuses: 'Larves brunes visqueuses adhérentes ⚠',
  larves_flasques_jaune: 'Larves flasques jaune clair',
  larves_sac_ecailles_noires: 'Larves en sac, écailles noires',
  momies_blanches_grises: 'Momies blanches ou grises',
  odeur_colle_putride: 'Odeur de colle ou putride ⚠',
  odeur_aigre: 'Odeur aigre',
  ailes_deformees: 'Ailes déformées',
  varroas_visibles: 'Varroas visibles',
  toiles_fausse_teigne: 'Toiles ou galeries de fausse teigne',
  coleoptere_noir: 'Coléoptère noir dans les rayons ⚠',
};

// L'heure exacte n'est fiable que dans le champ texte "heure" (brief §6 :
// conservé tel quel, ex. "16h00") — la partie horaire de "date" vaut minuit
// par défaut dès que l'heure d'origine était absente ou non structurée.
function dateHeureLisible(visite) {
  const date = new Date(visite.date).toLocaleDateString('fr-FR');
  return visite.heure ? `${date} à ${visite.heure}` : date;
}

// "Un chiffre absolu n'informe pas ; un écart, si." (addendum §7). Affiche la
// variation par rapport à la visite précédente quand les deux valeurs sont
// connues et différentes — jamais de calcul si l'une des deux est "non observé".
function champAvecEcart(valeur, valeurPrecedente) {
  if (valeur == null) return 'non observé';
  if (valeurPrecedente == null || valeurPrecedente === valeur) return String(valeur);
  const ecart = valeur - valeurPrecedente;
  return `${valeur} (${ecart > 0 ? '+' : '−'}${Math.abs(ecart)})`;
}

export function Historique({ colonieId, onRetour }) {
  const [ruche, setRuche] = useState(null);
  const [visites, setVisites] = useState(null); // null = en cours de chargement

  useEffect(() => {
    if (!colonieId) return;
    async function charger() {
      const colonie = await db.colonie.get(colonieId);
      const r = colonie ? await db.ruche.get(colonie.ruche_id) : null;
      setRuche(r ?? null);
      const liste = await listerVisitesColonie(colonieId);
      setVisites(liste.slice().reverse()); // la plus récente en premier
    }
    charger();
    // Se recharge tout seul quand une synchronisation en arrière-plan a pu
    // apporter de nouvelles visites depuis un autre appareil.
    return surSync(charger);
  }, [colonieId]);

  if (visites === null) return null;

  return (
    <div className="min-h-screen bg-ground text-ink p-4 flex flex-col gap-4 max-w-md mx-auto">
      <header>
        <h1 className="text-20 font-bold">
          {ruche ? `Ruche ${ruche.numero}` : 'Colonie'} — Historique
        </h1>
      </header>

      {visites.length === 0 && (
        <p className="text-13 text-ink-secondary">Aucune visite enregistrée pour cette colonie.</p>
      )}

      <ul className="bg-surface rounded border border-rule divide-y divide-rule">
        {visites.map((visite, indexDesc) => {
          // Le tableau est du plus récent au plus ancien : la visite
          // "précédente" dans le temps est l'entrée suivante du tableau.
          const precedente = visites[indexDesc + 1];
          const ecartJours = precedente
            ? Math.round(
                (new Date(visite.date).getTime() - new Date(precedente.date).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : null;

          return (
            <li key={visite.id} className="p-3">
              <p className="text-15 font-bold">{dateHeureLisible(visite)}</p>
              <p className="text-11 text-ink-muted mb-2">
                {ecartJours === null
                  ? 'Première visite enregistrée'
                  : ecartJours === 0
                    ? 'Le même jour que la précédente'
                    : `${ecartJours} j après la précédente`}
              </p>

              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-13 font-mono">
                <dt className="text-ink-secondary font-sans">Couvain operculé</dt>
                <dd>
                  {champAvecEcart(
                    visite.nb_cadres_couvain_opercule,
                    precedente?.nb_cadres_couvain_opercule
                  )}
                </dd>
                <dt className="text-ink-secondary font-sans">Couvain ouvert</dt>
                <dd>
                  {champAvecEcart(
                    visite.nb_cadres_couvain_ouvert,
                    precedente?.nb_cadres_couvain_ouvert
                  )}
                </dd>
                <dt className="text-ink-secondary font-sans">Provisions</dt>
                <dd>
                  {champAvecEcart(visite.nb_cadres_provisions, precedente?.nb_cadres_provisions)}
                </dd>
                <dt className="text-ink-secondary font-sans">Population</dt>
                <dd>{champAvecEcart(visite.population, precedente?.population)}</dd>
                <dt className="text-ink-secondary font-sans">Tempérament</dt>
                <dd>{champAvecEcart(visite.temperament, precedente?.temperament)}</dd>
                <dt className="text-ink-secondary font-sans">Bâtisse</dt>
                <dd>{champAvecEcart(visite.batisse, precedente?.batisse)}</dd>
                <dt className="text-ink-secondary font-sans">Ponte</dt>
                <dd>
                  {visite.score_ponte != null
                    ? `${champAvecEcart(visite.score_ponte, precedente?.score_ponte)} — ${PONTE_ECHELLE_LIBELLES[visite.score_ponte]}`
                    : 'non observé'}
                </dd>
                <dt className="text-ink-secondary font-sans">Reine vue</dt>
                <dd>{visite.reine_vue == null ? 'non observé' : visite.reine_vue ? 'Oui' : 'Non'}</dd>
                <dt className="text-ink-secondary font-sans">Œufs vus</dt>
                <dd>{visite.oeufs_vus == null ? 'non observé' : visite.oeufs_vus ? 'Oui' : 'Non'}</dd>
              </dl>

              {visite.cellules_royales_nb > 0 && (
                <p className="text-13 text-action-ink mt-2">
                  Cellules royales : {visite.cellules_royales_nb}
                  {visite.cellules_royales_type &&
                    ` (${CELLULES_ROYALES_TYPE_LIBELLES[visite.cellules_royales_type] ?? visite.cellules_royales_type})`}
                </p>
              )}

              {visite.anomalies?.length > 0 && (
                <p className="text-13 text-action-ink mt-2">
                  Anomalies : {visite.anomalies.map((a) => ANOMALIE_LIBELLES[a] ?? a).join(', ')}
                </p>
              )}

              {visite.signes_sanitaires?.length > 0 && (
                <p className="text-13 text-action-ink mt-2">
                  Signes observés :{' '}
                  {visite.signes_sanitaires
                    .map((s) => SIGNES_SANITAIRES_LIBELLES[s] ?? s)
                    .join(', ')}
                </p>
              )}

              {visite.suspicion_reglementee && (
                <p className="text-13 text-urgent-ink font-bold mt-2">
                  Suspicion réglementée signalée lors de cette visite
                </p>
              )}

              {visite.priorite && (
                <p className="text-13 text-ink-secondary mt-2">
                  Priorité : {visite.priorite[0].toUpperCase() + visite.priorite.slice(1)}
                </p>
              )}

              {visite.action_entreprise && (
                <p className="text-13 text-ink-secondary mt-1">
                  Action entreprise : {visite.action_entreprise}
                </p>
              )}

              {visite.observation_libre && (
                <p className="text-13 text-ink-secondary mt-2 italic">« {visite.observation_libre} »</p>
              )}
            </li>
          );
        })}
      </ul>

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
