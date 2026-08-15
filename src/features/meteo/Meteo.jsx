import { useEffect, useState } from 'react';
import { EnTeteEcran } from '../../components/EnTeteEcran.jsx';
import { listerRuchers } from '../../db/repositories/ruchers.js';
import { obtenirPrevisionRucher } from '../../db/repositories/meteo.js';
import { libelleCodeMeteo, estCreneauFavorable } from '../../lib/meteo.js';
import { recupererReleveNetatmo, CHAMPS_NETATMO } from '../../lib/netatmo.js';

function dateLisible(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function dateHeureLisible(iso) {
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function JourPrevision({ jour }) {
  const { libelle, emoji } = libelleCodeMeteo(jour.code);
  const favorable = estCreneauFavorable(jour);
  return (
    <li className={`p-3 flex items-center gap-3 ${favorable ? 'bg-vert/10' : ''}`}>
      <span className="text-24 w-8 text-center shrink-0">{emoji}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-14 font-bold capitalize">{dateLisible(jour.date)}</span>
        <span className="block text-12 text-ink-secondary">{libelle}</span>
      </span>
      <span className="text-13 text-ink-secondary text-right shrink-0">
        <span className="block">
          {jour.temperatureMin != null ? Math.round(jour.temperatureMin) : '?'}° / {jour.temperatureMax != null ? Math.round(jour.temperatureMax) : '?'}°
        </span>
        <span className="block text-12">
          💨 {jour.ventMaxKmh != null ? Math.round(jour.ventMaxKmh) : '?'} km/h · 🌧️ {jour.precipitationMm != null ? jour.precipitationMm.toFixed(1) : '?'} mm
        </span>
      </span>
      {favorable && (
        <span className="text-11 font-bold text-vert shrink-0 self-start" title="Créneau favorable à une visite (indicatif)">
          ✓
        </span>
      )}
    </li>
  );
}

function DetailMeteoRucher({ rucher, onRetour, onOuvrirSaisieRucher }) {
  const [prevision, setPrevision] = useState(null);

  useEffect(() => {
    let annule = false;
    setPrevision(null);
    obtenirPrevisionRucher(rucher).then((r) => {
      if (!annule) setPrevision(r);
    });
    return () => {
      annule = true;
    };
  }, [rucher]);

  return (
    <div className="min-h-screen bg-ground text-ink flex flex-col max-w-md mx-auto pb-14">
      <EnTeteEcran retourLibelle="← Météo" onRetour={onRetour} titre={`Météo — ${rucher.nom}`} />

      <div className="p-4 flex flex-col gap-4">

      {prevision === null && <p className="text-13 text-ink-secondary">Chargement…</p>}

      {prevision?.statut === 'sans_coordonnees' && (
        <div className="flex flex-col gap-3">
          <p className="text-13 text-ink-secondary">
            Ce rucher n'a pas de coordonnées renseignées : la météo ne peut pas être calculée.
          </p>
          <button
            type="button"
            onClick={() => onOuvrirSaisieRucher(rucher.id)}
            className="h-11 w-full rounded bg-miel text-ink text-15 font-bold"
          >
            Renseigner les coordonnées
          </button>
        </div>
      )}

      {prevision?.statut === 'erreur' && (
        <p className="text-13 text-bordeaux">
          Météo indisponible (hors-ligne, et aucune prévision n'a encore été mise en cache pour ce rucher).
        </p>
      )}

      {prevision?.statut === 'ok' && (
        <>
          {prevision.horsLigne && (
            <p className="text-12 text-ink-muted bg-surface-sunk border border-rule rounded p-2">
              Hors-ligne — dernière prévision récupérée le {dateHeureLisible(prevision.recupereeLe)}.
            </p>
          )}
          <ul className="bg-surface rounded border border-rule divide-y divide-rule">
            {prevision.jours.map((jour) => (
              <JourPrevision key={jour.date} jour={jour} />
            ))}
          </ul>
          <p className="text-11 text-ink-muted">
            ✓ vert = créneau indicatif favorable à une visite (température, vent, absence de pluie). Un simple repère,
            pas une recommandation.
          </p>
        </>
      )}
      </div>
    </div>
  );
}

function StationNetatmo() {
  const [releves, setReleves] = useState(undefined);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    recupererReleveNetatmo()
      .then(setReleves)
      .catch((err) => {
        setErreur(err.message);
        setReleves(null);
      });
  }, []);

  if (releves === undefined) return null;

  if (releves === null) {
    return <p className="text-11 text-ink-muted">Station Netatmo indisponible ({erreur}).</p>;
  }

  return (
    <section className="flex flex-col gap-2">
      <p className="text-13 text-ink-secondary">Ma station (domicile)</p>
      <ul className="bg-surface rounded border border-rule divide-y divide-rule">
        {releves.map((releve) => (
          <li key={releve.type} className="p-3">
            <p className="text-14 font-bold">{releve.libelle}</p>
            <p className="text-13 text-ink-secondary">
              {Object.entries(releve.donnees)
                .filter(([cle]) => CHAMPS_NETATMO[cle])
                .map(([cle, valeur]) => `${CHAMPS_NETATMO[cle].libelle} : ${valeur}${CHAMPS_NETATMO[cle].unite}`)
                .join(' · ')}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

// M8 (F8.1-F8.3) : module météo, accessible depuis l'écran d'accueil.
// F8.3 reste une heuristique fixe et indicative (voir lib/meteo.js) —
// distincte du moteur de règles paramétrable de l'addendum M12, hors
// périmètre ici.
export function Meteo({ onRetour, onOuvrirSaisieRucher }) {
  const [ruchers, setRuchers] = useState(null);
  const [rucherAffiche, setRucherAffiche] = useState(null);

  useEffect(() => {
    listerRuchers().then(setRuchers);
  }, []);

  if (rucherAffiche) {
    return (
      <DetailMeteoRucher
        rucher={rucherAffiche}
        onRetour={() => setRucherAffiche(null)}
        onOuvrirSaisieRucher={onOuvrirSaisieRucher}
      />
    );
  }

  if (ruchers === null) return null;

  return (
    <div className="min-h-screen bg-ground text-ink flex flex-col max-w-md mx-auto pb-14">
      <EnTeteEcran retourLibelle="← Retour" onRetour={onRetour} titre="Météo" />

      <div className="p-4 flex flex-col gap-4">

      <StationNetatmo />

      {ruchers.length === 0 && <p className="text-13 text-ink-secondary">Aucun rucher pour l'instant.</p>}

      <ul className="bg-surface rounded border border-rule divide-y divide-rule">
        {ruchers.map((rucher) => (
          <li key={rucher.id}>
            <button
              type="button"
              onClick={() => setRucherAffiche(rucher)}
              className="w-full text-left p-3 flex items-center justify-between gap-2"
            >
              <span>
                <span className="block text-15 font-bold">{rucher.nom}</span>
                <span className="block text-12 text-ink-secondary">{rucher.commune ?? ''}</span>
              </span>
              {rucher.latitude == null && (
                <span className="text-11 text-ink-muted shrink-0">coordonnées manquantes</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      </div>
    </div>
  );
}
