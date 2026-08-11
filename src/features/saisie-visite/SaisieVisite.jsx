import { useEffect, useMemo, useState } from 'react';
import { Compteur } from '../../components/Compteur.jsx';
import { Segmente } from '../../components/Segmente.jsx';
import { Chips } from '../../components/Chips.jsx';
import { ParcoursCategorie1 } from './ParcoursCategorie1.jsx';
import { listerColoniesActives } from '../../db/repositories/colonies.js';
import {
  obtenirDerniereVisite,
  enregistrerVisite,
} from '../../db/repositories/visites.js';
import { creerTache } from '../../db/repositories/taches.js';

const PONTE_OPTIONS = [
  { value: 'compacte', label: 'Compacte' },
  { value: 'lacunaire', label: 'Lacunaire' },
  { value: 'absente', label: 'Absente' },
  { value: 'males', label: 'Mâles' },
];

const SCORE_PONTE_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }));

// Libellés courts — brief L1+ §4. Champ facultatif, jamais reporté d'une
// visite à l'autre : c'est une observation, pas un état persistant.
const SCORE_PONTE_LIBELLES = {
  5: 'très compact',
  4: 'compact',
  3: 'correct',
  2: 'lacunaire',
  1: 'très dispersé',
};

const OUI_NON = [
  { value: true, label: 'Oui' },
  { value: false, label: 'Non' },
];

// Liste fermée conforme au brief L1+ §4 — trois signes marqués ⚠ déclenchent
// le parcours danger sanitaire de catégorie 1 (§5).
const SIGNES_SANITAIRES_OPTIONS = [
  { value: 'couvain_mosaique', label: 'Couvain en mosaïque' },
  { value: 'opercules_affaisses', label: 'Opercules affaissés ou percés' },
  { value: 'larves_brunes_visqueuses', label: 'Larves brunes visqueuses adhérentes ⚠' },
  { value: 'larves_flasques_jaune', label: 'Larves flasques jaune clair' },
  { value: 'larves_sac_ecailles_noires', label: 'Larves en sac, écailles noires' },
  { value: 'momies_blanches_grises', label: 'Momies blanches ou grises' },
  { value: 'odeur_colle_putride', label: 'Odeur de colle ou putride ⚠' },
  { value: 'odeur_aigre', label: 'Odeur aigre' },
  { value: 'ailes_deformees', label: 'Ailes déformées' },
  { value: 'varroas_visibles', label: 'Varroas visibles' },
  { value: 'toiles_fausse_teigne', label: 'Toiles ou galeries de fausse teigne' },
  { value: 'coleoptere_noir', label: 'Coléoptère noir dans les rayons ⚠' },
];

const SIGNES_CATEGORIE1 = new Set([
  'larves_brunes_visqueuses',
  'odeur_colle_putride',
  'coleoptere_noir',
]);

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

export function SaisieVisite({ colonieInitialeId, onRetour }) {
  const [contextes, setContextes] = useState([]);
  const [colonieId, setColonieId] = useState(null);
  const [derniereVisite, setDerniereVisite] = useState(null);
  const [valeurs, setValeurs] = useState(etatInitial().valeurs);
  const [provenance, setProvenance] = useState(etatInitial().provenance);
  const [anomalies, setAnomalies] = useState([]);
  const [scorePonte, setScorePonte] = useState(null);
  const [signesSanitaires, setSignesSanitaires] = useState([]);
  const [signesOuverts, setSignesOuverts] = useState(false);
  const [suspicionReglementee, setSuspicionReglementee] = useState(false);
  const [parcoursVisible, setParcoursVisible] = useState(false);
  const [observationLibre, setObservationLibre] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    listerColoniesActives().then((liste) => {
      setContextes(liste);
      const initialeValide = liste.some((c) => c.colonie.id === colonieInitialeId);
      if (initialeValide) {
        setColonieId(colonieInitialeId);
      } else if (liste.length > 0) {
        setColonieId(liste[0].colonie.id);
      }
    });
  }, [colonieInitialeId]);

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
      setScorePonte(null); // jamais reporté (brief L1+ §4)
      setSignesSanitaires([]); // jamais pré-cochés (brief L1+ §4)
      setSignesOuverts(false);
      setSuspicionReglementee(false);
      setParcoursVisible(false);
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

  // Déclenchement du parcours catégorie 1 (brief L1+ §5) : uniquement au
  // passage de "aucun signe ⚠ coché" à "au moins un". Le marquage de la
  // visite (suspicionReglementee) reste acquis même si le signe est ensuite
  // décoché — il atteste que le parcours a été affiché, pas l'état courant
  // des signes.
  function changerSignes(nouvelleListe) {
    const avaitDejaUnSigneCategorie1 = signesSanitaires.some((s) => SIGNES_CATEGORIE1.has(s));
    const contientSigneCategorie1 = nouvelleListe.some((s) => SIGNES_CATEGORIE1.has(s));
    setSignesSanitaires(nouvelleListe);
    if (contientSigneCategorie1 && !avaitDejaUnSigneCategorie1) {
      setParcoursVisible(true);
    }
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
      score_ponte: scorePonte ?? null,
      signes_sanitaires: signesSanitaires,
      suspicion_reglementee: suspicionReglementee,
      source_agregats: 'saisie_directe',
      observation_libre: observationLibre || null,
      provenance_champs: {
        ...provenance,
        observation_libre: observationLibre ? 'saisi' : 'vide',
        score_ponte: scorePonte ? 'saisi' : 'vide',
      },
      created_at: maintenant.toISOString(),
      updated_at: maintenant.toISOString(),
      deleted_at: null,
    };
  }

  // Étape 5 du parcours catégorie 1 (brief L1+ §5) : la tâche urgente n'est
  // créée qu'une fois la visite effectivement enregistrée, pour pouvoir la
  // rattacher via visite_declencheuse_id.
  async function creerTacheSuspicionSiNecessaire(visite) {
    if (!visite.suspicion_reglementee) return;
    const maintenant = new Date().toISOString();
    await creerTache({
      id: crypto.randomUUID(),
      colonie_id: visite.colonie_id,
      rucher_id: contexteActuel?.rucher?.id ?? null,
      libelle: `Suspicion de danger sanitaire de catégorie 1 — Ruche ${contexteActuel?.ruche?.numero ?? ''} : déclaration et prélèvement à organiser`,
      // Échéance = maintenant : l'état "urgent" (lib/etats.js) ne se
      // déclenche que sur une échéance échue, pas sur le champ `priorite`.
      // Une suspicion catégorie 1 n'a pas de délai — elle est due immédiatement.
      date_echeance: maintenant,
      priorite: 'urgente',
      origine: 'manuelle',
      statut: 'a_faire',
      visite_declencheuse_id: visite.id,
      created_at: maintenant,
      updated_at: maintenant,
      deleted_at: null,
    });
  }

  async function enregistrer() {
    if (!colonieId) return;
    try {
      const visite = await construireVisite();
      await enregistrerVisite(visite);
      await creerTacheSuspicionSiNecessaire(visite);
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
      await creerTacheSuspicionSiNecessaire(visite);
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

  // Non contournable (brief L1+ §5) : remplace l'écran de saisie tant que
  // l'exploitant n'a pas pris connaissance de la conduite à tenir.
  if (parcoursVisible) {
    return (
      <ParcoursCategorie1
        onContinuer={() => {
          setSuspicionReglementee(true);
          setParcoursVisible(false);
        }}
      />
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

      <section>
        <p className="text-sm text-gray-600 mb-1">Score de ponte</p>
        <Segmente
          options={SCORE_PONTE_OPTIONS}
          value={scorePonte}
          libelles={SCORE_PONTE_LIBELLES}
          onChange={setScorePonte}
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
        <button
          type="button"
          onClick={() => setSignesOuverts((v) => !v)}
          className="text-sm text-gray-600 underline"
        >
          {signesOuverts ? '▾' : '▸'} Signes observés
          {signesSanitaires.length > 0 && ` (${signesSanitaires.length})`}
        </button>
        {signesOuverts && (
          <div className="mt-2">
            <Chips
              options={SIGNES_SANITAIRES_OPTIONS}
              value={signesSanitaires}
              onChange={changerSignes}
            />
          </div>
        )}
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
