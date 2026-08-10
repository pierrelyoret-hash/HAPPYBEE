import { useEffect, useMemo, useState } from 'react';
import { Compteur } from '../../components/Compteur.jsx';
import { Segmente } from '../../components/Segmente.jsx';
import { Chips } from '../../components/Chips.jsx';
import { listerColoniesActives } from '../../db/repositories/colonies.js';
import {
  obtenirDerniereVisite,
  enregistrerVisite,
} from '../../db/repositories/visites.js';

const PONTE_OPTIONS = [
  { value: 'compacte', label: 'Compacte' },
  { value: 'lacunaire', label: 'Lacunaire' },
  { value: 'absente', label: 'Absente' },
  { value: 'males', label: 'Mâles' },
];

const OUI_NON = [
  { value: true, label: 'Oui' },
  { value: false, label: 'Non' },
];

// Liste conforme au cahier des charges (visite.anomalies) — le varroa se
// suit via un comptage dédié, il n'apparaît pas ici.
const ANOMALIE_OPTIONS = [
  { value: 'bourdonneuse', label: 'Bourdonneuse' },
  { value: 'orpheline', label: 'Orpheline' },
  { value: 'pillage', label: 'Pillage' },
  { value: 'fausse_teigne', label: 'Fausse teigne' },
  { value: 'mortalite_anormale', label: 'Mortalité anormale' },
  { value: 'diarrhee', label: 'Diarrhée' },
  { value: 'abeilles_tremblantes', label: 'Abeilles noires tremblantes' },
  { value: 'autre', label: 'Autre' },
];

// Champs pouvant être reportés d'une visite à l'autre (les anomalies en
// sont explicitement exclues — §3 addendum ergonomie).
const CHAMPS_REPORTABLES = [
  'nb_cadres_couvain_opercule',
  'nb_cadres_couvain_ouvert',
  'nb_cadres_provisions',
  'population',
  'ponte_qualite',
  'reine_vue',
  'oeufs_vus',
];

function etatInitial() {
  const valeurs = {};
  const provenance = {};
  for (const champ of CHAMPS_REPORTABLES) {
    valeurs[champ] = undefined;
    provenance[champ] = 'vide';
  }
  return { valeurs, provenance };
}

function dateLisible(iso) {
  return new Date(iso).toLocaleDateString('fr-FR');
}

export function SaisieVisite() {
  const [contextes, setContextes] = useState([]);
  const [colonieId, setColonieId] = useState(null);
  const [derniereVisite, setDerniereVisite] = useState(null);
  const [valeurs, setValeurs] = useState(etatInitial().valeurs);
  const [provenance, setProvenance] = useState(etatInitial().provenance);
  const [anomalies, setAnomalies] = useState([]);
  const [observationLibre, setObservationLibre] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    listerColoniesActives().then((liste) => {
      setContextes(liste);
      if (liste.length > 0) setColonieId(liste[0].colonie.id);
    });
  }, []);

  useEffect(() => {
    if (!colonieId) return;
    obtenirDerniereVisite(colonieId).then((visite) => {
      const { valeurs: nouvellesValeurs, provenance: nouvelleProvenance } =
        etatInitial();
      if (visite) {
        for (const champ of CHAMPS_REPORTABLES) {
          if (visite[champ] !== undefined && visite[champ] !== null) {
            nouvellesValeurs[champ] = visite[champ];
            nouvelleProvenance[champ] = 'reporte';
          }
        }
      }
      setDerniereVisite(visite ?? null);
      setValeurs(nouvellesValeurs);
      setProvenance(nouvelleProvenance);
      setAnomalies([]); // jamais reportées
      setObservationLibre('');
      setMessage(null);
    });
  }, [colonieId]);

  const contexteActuel = contextes.find((c) => c.colonie.id === colonieId);

  const positionTournee = useMemo(() => {
    if (!contexteActuel?.rucher?.ordre_tournee) return null;
    const index = contexteActuel.rucher.ordre_tournee.indexOf(
      contexteActuel.ruche.id
    );
    if (index === -1) return null;
    return `${index + 1}/${contexteActuel.rucher.ordre_tournee.length}`;
  }, [contexteActuel]);

  function modifierChamp(champ, valeur) {
    setValeurs((v) => ({ ...v, [champ]: valeur }));
    setProvenance((p) => ({ ...p, [champ]: 'saisi' }));
  }

  const dateReference = derniereVisite ? dateLisible(derniereVisite.date) : null;

  async function construireVisite() {
    const maintenant = new Date();
    return {
      id: crypto.randomUUID(),
      colonie_id: colonieId,
      date: maintenant.toISOString(),
      heure: maintenant.toTimeString().slice(0, 5),
      type: 'controle_routine',
      nb_cadres_couvain_opercule: valeurs.nb_cadres_couvain_opercule ?? null,
      nb_cadres_couvain_ouvert: valeurs.nb_cadres_couvain_ouvert ?? null,
      nb_cadres_provisions: valeurs.nb_cadres_provisions ?? null,
      population: valeurs.population ?? null,
      reine_vue: valeurs.reine_vue ?? null,
      oeufs_vus: valeurs.oeufs_vus ?? null,
      ponte_qualite: valeurs.ponte_qualite ?? null,
      anomalies,
      observation_libre: observationLibre || null,
      provenance_champs: {
        ...provenance,
        observation_libre: observationLibre ? 'saisi' : 'vide',
      },
      created_at: maintenant.toISOString(),
      updated_at: maintenant.toISOString(),
      deleted_at: null,
    };
  }

  async function enregistrer() {
    if (!colonieId) return;
    try {
      const visite = await construireVisite();
      await enregistrerVisite(visite);
      setDerniereVisite(visite);
      setMessage('Visite enregistrée.');
    } catch (err) {
      console.error("[écran B] échec de l'enregistrement", err);
      setMessage("Erreur : la visite n'a pas pu être enregistrée.");
    }
  }

  async function rienASignaler() {
    if (!colonieId) return;
    try {
      const visite = await construireVisite();
      await enregistrerVisite(visite);
      setDerniereVisite(visite);
      setMessage('Visite enregistrée — rien à signaler.');
    } catch (err) {
      console.error('[écran B] échec de "rien à signaler"', err);
      setMessage("Erreur : la visite n'a pas pu être enregistrée.");
    }
  }

  if (contextes.length === 0) {
    return (
      <p className="p-4 text-base text-gray-600">
        Aucune colonie active trouvée. Vérifie que le jeu de données de démo
        de l'étape 1 a bien été inséré.
      </p>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 p-4 flex flex-col gap-4 max-w-md mx-auto">
      <header className="flex flex-col gap-1">
        <select
          className="text-base h-12 border border-gray-300 rounded px-2"
          value={colonieId ?? ''}
          onChange={(e) => setColonieId(e.target.value)}
        >
          {contextes.map(({ colonie, ruche }) => (
            <option key={colonie.id} value={colonie.id}>
              Ruche {ruche.numero}
            </option>
          ))}
        </select>
        <p className="text-sm text-gray-600">
          {positionTournee && `Position ${positionTournee} de la tournée · `}
          {dateReference
            ? `Dernière visite : ${dateReference}`
            : 'Aucune visite précédente'}
        </p>
      </header>

      <button
        type="button"
        onClick={rienASignaler}
        className="h-[46px] w-full rounded bg-green-600 text-white text-base font-medium"
      >
        Rien à signaler
        <span className="block text-[11px] font-normal opacity-90">
          enregistre la visite avec les valeurs ci-dessous
        </span>
      </button>

      <section className="flex justify-around">
        <Compteur
          value={valeurs.nb_cadres_couvain_opercule}
          provenance={provenance.nb_cadres_couvain_opercule}
          referenceDate={dateReference}
          onChange={(v) => modifierChamp('nb_cadres_couvain_opercule', v)}
        />
        <Compteur
          value={valeurs.nb_cadres_couvain_ouvert}
          provenance={provenance.nb_cadres_couvain_ouvert}
          referenceDate={dateReference}
          onChange={(v) => modifierChamp('nb_cadres_couvain_ouvert', v)}
        />
        <Compteur
          value={valeurs.nb_cadres_provisions}
          provenance={provenance.nb_cadres_provisions}
          referenceDate={dateReference}
          onChange={(v) => modifierChamp('nb_cadres_provisions', v)}
        />
      </section>

      <section>
        <p className="text-sm text-gray-600 mb-1">Population</p>
        <Segmente
          options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))}
          value={valeurs.population}
          provenance={provenance.population}
          referenceDate={dateReference}
          onChange={(v) => modifierChamp('population', v)}
        />
      </section>

      <section>
        <p className="text-sm text-gray-600 mb-1">Ponte</p>
        <Segmente
          options={PONTE_OPTIONS}
          value={valeurs.ponte_qualite}
          provenance={provenance.ponte_qualite}
          referenceDate={dateReference}
          onChange={(v) => modifierChamp('ponte_qualite', v)}
        />
      </section>

      <section className="flex gap-4">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1">Reine vue</p>
          <Segmente
            options={OUI_NON}
            value={valeurs.reine_vue}
            provenance={provenance.reine_vue}
            referenceDate={dateReference}
            onChange={(v) => modifierChamp('reine_vue', v)}
          />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1">Œufs vus</p>
          <Segmente
            options={OUI_NON}
            value={valeurs.oeufs_vus}
            provenance={provenance.oeufs_vus}
            referenceDate={dateReference}
            onChange={(v) => modifierChamp('oeufs_vus', v)}
          />
        </div>
      </section>

      <section>
        <p className="text-sm text-gray-600 mb-1">Anomalies</p>
        <Chips options={ANOMALIE_OPTIONS} value={anomalies} onChange={setAnomalies} />
      </section>

      <section>
        <label className="text-sm text-gray-600 mb-1 block" htmlFor="observation_libre">
          Note libre
        </label>
        <textarea
          id="observation_libre"
          className="w-full border border-gray-300 rounded p-2 text-base"
          rows={3}
          value={observationLibre}
          onChange={(e) => setObservationLibre(e.target.value)}
        />
      </section>

      {message && <p className="text-sm text-center">{message}</p>}

      <button
        type="button"
        onClick={enregistrer}
        className="h-[46px] w-full rounded bg-blue-600 text-white text-base font-medium"
      >
        Enregistrer
      </button>
    </div>
  );
}
