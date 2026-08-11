import { useEffect, useState } from 'react';
import { db } from '../../db/db.js';
import { listerVisitesColonie } from '../../db/repositories/visites.js';

const PONTE_LIBELLES = {
  compacte: 'Compacte',
  lacunaire: 'Lacunaire',
  absente: 'Absente',
  males: 'Mâles',
};

const ANOMALIE_LIBELLES = {
  bourdonneuse: 'Bourdonneuse',
  orpheline: 'Orpheline',
  pillage: 'Pillage',
  fausse_teigne: 'Fausse teigne',
  mortalite_anormale: 'Mortalité anormale',
  diarrhee: 'Diarrhée',
  abeilles_tremblantes: 'Abeilles noires tremblantes',
  autre: 'Autre',
};

// Brief L1+ §4 — mêmes libellés courts qu'à la saisie.
const SCORE_PONTE_LIBELLES = {
  5: 'très compact',
  4: 'compact',
  3: 'correct',
  2: 'lacunaire',
  1: 'très dispersé',
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
    (async () => {
      const colonie = await db.colonie.get(colonieId);
      const r = colonie ? await db.ruche.get(colonie.ruche_id) : null;
      setRuche(r ?? null);
      const liste = await listerVisitesColonie(colonieId);
      setVisites(liste.slice().reverse()); // la plus récente en premier
    })();
  }, [colonieId]);

  if (visites === null) return null;

  return (
    <div className="min-h-screen bg-white text-gray-900 p-4 flex flex-col gap-4 max-w-md mx-auto">
      <header>
        <h1 className="text-xl font-medium">
          {ruche ? `Ruche ${ruche.numero}` : 'Colonie'} — Historique
        </h1>
      </header>

      {visites.length === 0 && (
        <p className="text-sm text-gray-600">Aucune visite enregistrée pour cette colonie.</p>
      )}

      <ul className="flex flex-col gap-3">
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
            <li key={visite.id} className="border border-gray-200 rounded p-3">
              <p className="text-base font-medium">{dateHeureLisible(visite)}</p>
              <p className="text-[11px] text-gray-500 mb-2">
                {ecartJours === null
                  ? 'Première visite enregistrée'
                  : ecartJours === 0
                    ? 'Le même jour que la précédente'
                    : `${ecartJours} j après la précédente`}
              </p>

              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                <dt className="text-gray-500">Couvain operculé</dt>
                <dd>
                  {champAvecEcart(
                    visite.nb_cadres_couvain_opercule,
                    precedente?.nb_cadres_couvain_opercule
                  )}
                </dd>
                <dt className="text-gray-500">Couvain ouvert</dt>
                <dd>
                  {champAvecEcart(
                    visite.nb_cadres_couvain_ouvert,
                    precedente?.nb_cadres_couvain_ouvert
                  )}
                </dd>
                <dt className="text-gray-500">Provisions</dt>
                <dd>
                  {champAvecEcart(visite.nb_cadres_provisions, precedente?.nb_cadres_provisions)}
                </dd>
                <dt className="text-gray-500">Population</dt>
                <dd>{champAvecEcart(visite.population, precedente?.population)}</dd>
                <dt className="text-gray-500">Ponte</dt>
                <dd>{visite.ponte_qualite ? PONTE_LIBELLES[visite.ponte_qualite] : 'non observé'}</dd>
                <dt className="text-gray-500">Score de ponte</dt>
                <dd>
                  {visite.score_ponte
                    ? `${champAvecEcart(visite.score_ponte, precedente?.score_ponte)} — ${SCORE_PONTE_LIBELLES[visite.score_ponte]}`
                    : 'non observé'}
                </dd>
                <dt className="text-gray-500">Reine vue</dt>
                <dd>{visite.reine_vue == null ? 'non observé' : visite.reine_vue ? 'Oui' : 'Non'}</dd>
                <dt className="text-gray-500">Œufs vus</dt>
                <dd>{visite.oeufs_vus == null ? 'non observé' : visite.oeufs_vus ? 'Oui' : 'Non'}</dd>
              </dl>

              {visite.anomalies?.length > 0 && (
                <p className="text-sm text-amber-700 mt-2">
                  Anomalies : {visite.anomalies.map((a) => ANOMALIE_LIBELLES[a] ?? a).join(', ')}
                </p>
              )}

              {visite.signes_sanitaires?.length > 0 && (
                <p className="text-sm text-amber-700 mt-2">
                  Signes observés :{' '}
                  {visite.signes_sanitaires
                    .map((s) => SIGNES_SANITAIRES_LIBELLES[s] ?? s)
                    .join(', ')}
                </p>
              )}

              {visite.suspicion_reglementee && (
                <p className="text-sm text-red-700 font-medium mt-2">
                  Suspicion réglementée signalée lors de cette visite
                </p>
              )}

              {visite.priorite && (
                <p className="text-sm text-gray-700 mt-2">
                  Priorité : {visite.priorite[0].toUpperCase() + visite.priorite.slice(1)}
                </p>
              )}

              {visite.action_entreprise && (
                <p className="text-sm text-gray-700 mt-1">
                  Action entreprise : {visite.action_entreprise}
                </p>
              )}

              {visite.observation_libre && (
                <p className="text-sm text-gray-700 mt-2 italic">« {visite.observation_libre} »</p>
              )}
            </li>
          );
        })}
      </ul>

      {onRetour && (
        <button
          type="button"
          onClick={onRetour}
          className="h-12 w-full text-sm text-gray-600 underline"
        >
          Retour à la vue d'ensemble
        </button>
      )}
    </div>
  );
}
