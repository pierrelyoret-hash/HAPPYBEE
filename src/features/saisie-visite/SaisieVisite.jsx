import { useEffect, useMemo, useState } from 'react';
import { Compteur } from '../../components/Compteur.jsx';
import { Segmente } from '../../components/Segmente.jsx';
import { Interrupteur } from '../../components/Interrupteur.jsx';
import { Chips } from '../../components/Chips.jsx';
import { ParcoursCategorie1 } from './ParcoursCategorie1.jsx';
import { listerColoniesActives } from '../../db/repositories/colonies.js';
import {
  obtenirDerniereVisite,
  enregistrerVisite,
} from '../../db/repositories/visites.js';
import { creerTache } from '../../db/repositories/taches.js';

// Correction écrans L1 §7/§9.2 : un seul contrôle pour la ponte, sur 0-5.
// "Mâles" n'est pas un degré de compacité — il est sorti de cette échelle
// et rejoint les anomalies (voir ANOMALIE_OPTIONS). Champ facultatif,
// jamais reporté d'une visite à l'autre : c'est une observation, pas un
// état persistant.
const PONTE_ECHELLE_OPTIONS = [0, 1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }));

const PONTE_ECHELLE_LIBELLES = {
  0: 'aucune ponte',
  1: 'très dispersée, mosaïque',
  2: 'lacunaire, nombreux trous',
  3: 'correcte, cellules vides dispersées',
  4: 'compacte, quelques cellules vides',
  5: 'très compacte, ≥ 90 % des cellules operculées',
};

const PONTE_ECHELLE_LEGENDE = '0 aucune ponte · 5 très compacte';

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
  { value: 'ponte_males', label: 'Ponte de mâles' },
  { value: 'autre', label: 'Autre' },
];

// Champs pouvant être reportés d'une visite à l'autre (les anomalies en
// sont explicitement exclues — §3 addendum ergonomie). ponte_qualite a été
// retiré du schéma (correction écrans L1 §7) ; score_ponte, qui le
// remplace, reste hors de cette liste — il n'est jamais reporté.
const CHAMPS_REPORTABLES = [
  'nb_cadres_couvain_opercule',
  'nb_cadres_couvain_ouvert',
  'nb_cadres_provisions',
  'population',
  'reine_vue',
  'oeufs_vus',
  // Assignés à L1 le 11/08/2026 (cahier des charges §4.2, jamais construits
  // avant cette date) : traits de colonie relativement stables d'une visite
  // à l'autre, contrairement aux cellules royales — reportables comme population.
  'temperament',
  'batisse',
];

const ECHELLE_1_A_5 = [1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }));

const CELLULES_ROYALES_TYPE_OPTIONS = [
  { value: 'essaimage', label: 'Essaimage' },
  { value: 'supersedure', label: 'Supersédure' },
  { value: 'sauvete', label: 'Sauveté' },
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

export function SaisieVisite({ colonieInitialeId, onRetour, onOuvrirHistorique }) {
  const [contextes, setContextes] = useState([]);
  const [colonieId, setColonieId] = useState(null);
  const [derniereVisite, setDerniereVisite] = useState(null);
  const [valeurs, setValeurs] = useState(etatInitial().valeurs);
  const [provenance, setProvenance] = useState(etatInitial().provenance);
  const [anomalies, setAnomalies] = useState([]);
  const [scorePonte, setScorePonte] = useState(null);
  const [signesSanitaires, setSignesSanitaires] = useState([]);
  const [signesOuverts, setSignesOuverts] = useState(false);
  const [cellulesRoyalesNb, setCellulesRoyalesNb] = useState(0);
  const [cellulesRoyalesType, setCellulesRoyalesType] = useState(null);
  const [detailCouvainOuvert, setDetailCouvainOuvert] = useState(false);
  const [anomaliesOuvertes, setAnomaliesOuvertes] = useState(false);
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
      setCellulesRoyalesNb(0); // jamais reporté — signal ponctuel, pas un état persistant
      setCellulesRoyalesType(null);
      setSignesOuverts(false);
      setDetailCouvainOuvert(false);
      setAnomaliesOuvertes(false);
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
      temperament: valeurs.temperament ?? null,
      batisse: valeurs.batisse ?? null,
      cellules_royales_nb: cellulesRoyalesNb,
      cellules_royales_type: cellulesRoyalesNb > 0 ? cellulesRoyalesType : null,
      anomalies,
      score_ponte: scorePonte ?? null,
      signes_sanitaires: signesSanitaires,
      suspicion_reglementee: suspicionReglementee,
      source_agregats: 'saisie_directe',
      observation_libre: observationLibre || null,
      provenance_champs: {
        ...provenance,
        observation_libre: observationLibre ? 'saisi' : 'vide',
        // scorePonte peut valoir 0 ("aucune ponte", une observation réelle,
        // distincte de "non observé") — comparaison explicite à null/undefined,
        // jamais de test de vérité JS qui traiterait 0 comme vide.
        score_ponte: scorePonte != null ? 'saisi' : 'vide',
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
      <p className="p-4 text-15 text-ink-secondary">
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
    <div className="min-h-screen bg-ground text-ink p-4 flex flex-col gap-4 max-w-md mx-auto">
      <header className="flex flex-col gap-1">
        {onRetour && (
          <button
            type="button"
            onClick={onRetour}
            className="text-13 text-ink-secondary underline self-start mb-1"
          >
            ← Retour
          </button>
        )}
        <select
          className="text-15 h-12 border border-rule-strong rounded px-2 bg-surface text-ink"
          value={colonieId ?? ''}
          onChange={(e) => setColonieId(e.target.value)}
        >
          {contextes.map(({ colonie, ruche }) => (
            <option key={colonie.id} value={colonie.id}>
              Ruche {ruche.numero}
            </option>
          ))}
        </select>
        <p className="text-13 text-ink-secondary">
          {positionTournee && `Position ${positionTournee} de la tournée · `}
          {dateReference
            ? `Dernière visite : ${dateReference}`
            : 'Aucune visite précédente'}
        </p>
      </header>

      {/* Bouton secondaire (brief refonte §5/§6.1 : un seul bouton principal
          par écran — c'est "Enregistrer" plus bas). "Rien à signaler" reste
          entièrement fonctionnel, juste visuellement au second plan. */}
      <button
        type="button"
        onClick={rienASignaler}
        className="h-10 w-full rounded bg-surface border border-rule-strong text-ink text-15 font-bold"
      >
        Rien à signaler
        <span className="block text-11 font-normal text-ink-secondary">
          enregistre la visite avec les valeurs ci-dessous
        </span>
      </button>

      <section className="flex flex-col gap-3">
        {detailCouvainOuvert ? (
          <>
            <Compteur
              label="Couvain operculé"
              value={valeurs.nb_cadres_couvain_opercule}
              provenance={provenance.nb_cadres_couvain_opercule}
              referenceDate={dateReference}
              onChange={(v) => modifierChamp('nb_cadres_couvain_opercule', v)}
            />
            <Compteur
              label="Couvain ouvert"
              value={valeurs.nb_cadres_couvain_ouvert}
              provenance={provenance.nb_cadres_couvain_ouvert}
              referenceDate={dateReference}
              onChange={(v) => modifierChamp('nb_cadres_couvain_ouvert', v)}
            />
            <button
              type="button"
              onClick={() => setDetailCouvainOuvert(false)}
              className="text-12 text-ink-secondary underline self-start"
            >
              Revenir au compteur unique
            </button>
          </>
        ) : (
          <>
            {/* Vue par défaut (correction écrans L1 §9.1) : un ordre de
                grandeur suffit en visite de routine. Compte-t-on encore les
                deux séparément, les champs du schéma restent intacts — seul
                cet affichage édite nb_cadres_couvain_opercule. */}
            <Compteur
              label="Cadres de couvain"
              value={valeurs.nb_cadres_couvain_opercule}
              provenance={provenance.nb_cadres_couvain_opercule}
              referenceDate={dateReference}
              onChange={(v) => modifierChamp('nb_cadres_couvain_opercule', v)}
            />
            <button
              type="button"
              onClick={() => setDetailCouvainOuvert(true)}
              className="text-12 text-ink-secondary underline self-start"
            >
              Détailler operculé / ouvert
            </button>
          </>
        )}
        <Compteur
          label="Provisions"
          value={valeurs.nb_cadres_provisions}
          provenance={provenance.nb_cadres_provisions}
          referenceDate={dateReference}
          onChange={(v) => modifierChamp('nb_cadres_provisions', v)}
        />
      </section>

      {/* Regroupe trois échelles 1-5 de même nature (correction écrans L1
          §9, esprit "cinq blocs, pas sept" — tempérament et bâtisse ont été
          assignés à L1 le 11/08/2026 mais n'ont pas leur propre bloc pour
          ne pas recréer l'éparpillement qu'on vient de corriger). */}
      <section className="border border-rule rounded p-3 flex flex-col gap-3">
        <p className="text-13 font-bold text-ink-secondary">Colonie</p>
        <div>
          <p className="text-13 text-ink-secondary mb-1">Population</p>
          <Segmente
            options={ECHELLE_1_A_5}
            value={valeurs.population}
            provenance={provenance.population}
            referenceDate={dateReference}
            onChange={(v) => modifierChamp('population', v)}
          />
        </div>
        <div>
          <p className="text-13 text-ink-secondary mb-1">Tempérament</p>
          <Segmente
            options={ECHELLE_1_A_5}
            value={valeurs.temperament}
            provenance={provenance.temperament}
            referenceDate={dateReference}
            onChange={(v) => modifierChamp('temperament', v)}
          />
        </div>
        <div>
          <p className="text-13 text-ink-secondary mb-1">Bâtisse</p>
          <Segmente
            options={ECHELLE_1_A_5}
            value={valeurs.batisse}
            provenance={provenance.batisse}
            referenceDate={dateReference}
            onChange={(v) => modifierChamp('batisse', v)}
          />
        </div>
      </section>

      <section className="border border-rule rounded p-3 flex flex-col gap-3">
        <p className="text-13 font-bold text-ink-secondary">Reine et ponte</p>
        <div className="flex gap-4">
          <div className="flex-1">
            <Interrupteur
              label="Reine vue"
              value={valeurs.reine_vue}
              provenance={provenance.reine_vue}
              referenceDate={dateReference}
              onChange={(v) => modifierChamp('reine_vue', v)}
            />
          </div>
          <div className="flex-1">
            <Interrupteur
              label="Œufs vus"
              value={valeurs.oeufs_vus}
              provenance={provenance.oeufs_vus}
              referenceDate={dateReference}
              onChange={(v) => modifierChamp('oeufs_vus', v)}
            />
          </div>
        </div>
        <div>
          <p className="text-13 text-ink-secondary mb-1">Ponte</p>
          <Segmente
            options={PONTE_ECHELLE_OPTIONS}
            value={scorePonte}
            libelles={PONTE_ECHELLE_LIBELLES}
            legende={PONTE_ECHELLE_LEGENDE}
            onChange={setScorePonte}
          />
        </div>
        {/* Assigné à L1 le 11/08/2026 — jamais reporté : la présence de
            cellules royales est un signal ponctuel, pas un état persistant. */}
        <Compteur
          label="Cellules royales"
          value={cellulesRoyalesNb}
          max={30}
          onChange={setCellulesRoyalesNb}
        />
        {cellulesRoyalesNb > 0 && (
          <div>
            <p className="text-13 text-ink-secondary mb-1">Type</p>
            <Segmente
              options={CELLULES_ROYALES_TYPE_OPTIONS}
              value={cellulesRoyalesType}
              onChange={setCellulesRoyalesType}
            />
          </div>
        )}
      </section>

      <section>
        <button
          type="button"
          onClick={() => setAnomaliesOuvertes((v) => !v)}
          className="text-13 text-ink-secondary underline"
        >
          {anomaliesOuvertes ? '▾' : '▸'} Signaler une anomalie
          {anomalies.length > 0 && ` (${anomalies.length})`}
        </button>
        {anomaliesOuvertes && (
          <div className="mt-2">
            <Chips options={ANOMALIE_OPTIONS} value={anomalies} onChange={setAnomalies} />
          </div>
        )}
      </section>

      <section>
        <button
          type="button"
          onClick={() => setSignesOuverts((v) => !v)}
          className="text-13 text-ink-secondary underline"
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
        <label className="text-13 text-ink-secondary mb-1 block" htmlFor="observation_libre">
          Note libre
        </label>
        <textarea
          id="observation_libre"
          className="w-full border border-rule-strong rounded p-2 text-15 bg-surface text-ink"
          rows={3}
          value={observationLibre}
          onChange={(e) => setObservationLibre(e.target.value)}
        />
      </section>

      {message && <p className="text-13 text-center text-ink-secondary">{message}</p>}

      <button
        type="button"
        onClick={enregistrer}
        className="h-[46px] w-full rounded bg-ink text-surface text-15 font-bold"
      >
        Enregistrer
      </button>

      {onOuvrirHistorique && colonieId && (
        <button
          type="button"
          onClick={() => onOuvrirHistorique(colonieId)}
          className="h-12 w-full text-13 text-ink-secondary underline"
        >
          Voir l'historique
        </button>
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
