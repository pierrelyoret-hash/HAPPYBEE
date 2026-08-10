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

function dateHeureLisible(iso) {
  const d = new Date(iso);
  return `${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

// Un champ non renseigné reste distinct d'un champ renseigné à zéro
// (addendum ergonomie §3) — jamais de "0" silencieux à la place de "non observé".
function champLisible(valeur) {
  return valeur == null ? 'non observé' : String(valeur);
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
              <p className="text-base font-medium">{dateHeureLisible(visite.date)}</p>
              <p className="text-[11px] text-gray-500 mb-2">
                {ecartJours === null
                  ? 'Première visite enregistrée'
                  : ecartJours === 0
                    ? 'Le même jour que la précédente'
                    : `${ecartJours} j après la précédente`}
              </p>

              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                <dt className="text-gray-500">Couvain operculé</dt>
                <dd>{champLisible(visite.nb_cadres_couvain_opercule)}</dd>
                <dt className="text-gray-500">Couvain ouvert</dt>
                <dd>{champLisible(visite.nb_cadres_couvain_ouvert)}</dd>
                <dt className="text-gray-500">Provisions</dt>
                <dd>{champLisible(visite.nb_cadres_provisions)}</dd>
                <dt className="text-gray-500">Population</dt>
                <dd>{champLisible(visite.population)}</dd>
                <dt className="text-gray-500">Ponte</dt>
                <dd>{visite.ponte_qualite ? PONTE_LIBELLES[visite.ponte_qualite] : 'non observé'}</dd>
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
