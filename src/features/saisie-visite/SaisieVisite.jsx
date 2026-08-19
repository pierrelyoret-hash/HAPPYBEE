import { useEffect, useMemo, useRef, useState } from 'react';
import { Compteur } from '../../components/Compteur.jsx';
import { EnTeteEcran } from '../../components/EnTeteEcran.jsx';
import { Segmente } from '../../components/Segmente.jsx';
import { Interrupteur } from '../../components/Interrupteur.jsx';
import { Chips } from '../../components/Chips.jsx';
import { ParcoursCategorie1 } from './ParcoursCategorie1.jsx';
import { listerColoniesActives } from '../../db/repositories/colonies.js';
import {
  obtenirDerniereVisite,
  enregistrerVisite,
} from '../../db/repositories/visites.js';
import { enregistrerTraitement, enregistrerNourrissement } from '../../db/repositories/sanitaire.js';
import { enregistrerPhoto } from '../../db/repositories/photos.js';
import { comprimerImage } from '../../lib/compressionImage.js';
import { joursDepuis } from '../../lib/etats.js';
import { SIGNES_SANITAIRES_OPTIONS, SIGNES_CATEGORIE1 } from '../../lib/taxonomieSanitaire.js';
import { VOIE_LIBELLES, TYPE_NOURRISSEMENT_LIBELLES } from '../../lib/libellesSanitaire.js';
import {
  creerTacheSuspicionSiNecessaire,
  creerRappelsInterventionSiNecessaire,
} from '../../lib/reglesVisite.js';
import { capturerMeteoDomicileSiApplicable } from '../../lib/netatmo.js';
import { transcrire } from '../../lib/transcription.js';
import { corrigerGlossaire } from '../../lib/glossaireDictee.js';
import { structurerDictee } from '../../lib/structurationIA.js';

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

function anciennete(jours) {
  if (jours == null) return 'jamais visitée';
  if (jours === 0) return "vue aujourd'hui";
  return `vue il y a ${jours} j`;
}

export function SaisieVisite({
  rucherId,
  colonieInitialeId,
  onRetour,
  onOuvrirHistorique,
  onOuvrirSanitaire,
  onOuvrirObservationCadre,
  onOuvrirRecolte,
  onOuvrirMouvement,
}) {
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
  const [haussesPosees, setHaussesPosees] = useState(false);
  const [cadreCouvainIntroduit, setCadreCouvainIntroduit] = useState(false);
  const [detailCouvainOuvert, setDetailCouvainOuvert] = useState(false);
  const [colonieOuverte, setColonieOuverte] = useState(false);
  const [anomaliesOuvertes, setAnomaliesOuvertes] = useState(false);
  const [suspicionReglementee, setSuspicionReglementee] = useState(false);
  const [parcoursVisible, setParcoursVisible] = useState(false);
  const [observationLibre, setObservationLibre] = useState('');
  const [photosEnAttente, setPhotosEnAttente] = useState([]);
  const [compressionEnCours, setCompressionEnCours] = useState(false);
  const [message, setMessage] = useState(null);
  // Dictée intégrée (15/08/2026) : disponible ici plutôt que seulement dans
  // le parcours "Tournée vocale" séparé, puisque c'est cet écran qui reçoit
  // à la fois l'accès via le fil de tournée et l'accès direct à une ruche.
  // Contrairement à ce parcours différé, l'audio n'est jamais persisté :
  // il sert une fois à extraire le texte, puis est jeté — dicter remplit
  // le formulaire immédiatement, review par relecture du formulaire lui-même.
  const [dicteeStatut, setDicteeStatut] = useState('inactif'); // 'inactif' | 'enregistrement' | 'transcription' | 'structuration' | 'erreur'
  const [transcriptionBrute, setTranscriptionBrute] = useState(null);
  const [progresModele, setProgresModele] = useState(null);
  const [traitementsDictes, setTraitementsDictes] = useState([]);
  const [nourrissementsDictes, setNourrissementsDictes] = useState([]);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  // Transporte l'information « une dictée a été abandonnée » du nettoyage
  // d'effet vers le corps de l'effet suivant : React exécute le nettoyage
  // avant, et le corps remet `message` à null — poser le message depuis le
  // nettoyage le ferait donc écraser aussitôt.
  const dicteeInterrompueRef = useRef(false);
  // Valeur à jour de colonieId, lisible depuis les callbacks asynchrones de
  // traiterDictee (transcription/structuration) — la variable colonieId,
  // elle, reste figée à sa valeur au moment de l'appel (fermeture). Mise à
  // jour à chaque rendu, sans passer par un effet : elle doit refléter la
  // colonie affichée immédiatement, pas après le prochain cycle d'effets.
  const colonieIdRef = useRef(colonieId);
  colonieIdRef.current = colonieId;

  // Multi-rucher (14/08/2026) : sans ce filtre, le sélecteur mélangeait les
  // colonies de tous les ruchers — deux "Ruche 1" côte à côte dès qu'un
  // second rucher existe, impossible à distinguer.
  useEffect(() => {
    listerColoniesActives().then((toutes) => {
      const liste = rucherId ? toutes.filter((c) => c.rucher.id === rucherId) : toutes;
      setContextes(liste);
      const initialeValide = liste.some((c) => c.colonie.id === colonieInitialeId);
      if (initialeValide) {
        setColonieId(colonieInitialeId);
      } else if (liste.length > 0) {
        setColonieId(liste[0].colonie.id);
      }
    });
  }, [rucherId, colonieInitialeId]);

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
      setHaussesPosees(false); // idem : une action de cette visite, pas un état de la colonie
      setCadreCouvainIntroduit(false);
      setSignesOuverts(false);
      setDetailCouvainOuvert(false);
      setColonieOuverte(false);
      setAnomaliesOuvertes(false);
      setSuspicionReglementee(false);
      setParcoursVisible(false);
      setObservationLibre('');
      // Photos jamais reportées — même logique que les cellules royales :
      // un signal ponctuel de cette visite précise, pas un état persistant.
      setPhotosEnAttente((precedentes) => {
        precedentes.forEach((p) => URL.revokeObjectURL(p.url));
        return [];
      });
      // Dictée jamais reportée d'une colonie à l'autre — même logique que
      // les photos et cellules royales ci-dessus.
      setDicteeStatut('inactif');
      setTranscriptionBrute(null);
      setTraitementsDictes([]);
      setNourrissementsDictes([]);
      // Une dictée abandonnée ne disparaît pas en silence (arbitrage du
      // 16/08/2026) : gants aux mains au rucher, perdre un enregistrement
      // sans aucun signal est le vrai risque. Posé ici, après la remise à
      // zéro de `message`, sinon il serait écrasé.
      setMessage(
        dicteeInterrompueRef.current ? 'Dictée interrompue — changement de colonie.' : null
      );
      dicteeInterrompueRef.current = false;
    });
    // Changer de colonie (ou quitter l'écran) pendant une dictée coupe le
    // micro pour de bon — voir annulerDictee. Sans ce nettoyage,
    // l'enregistrement se poursuivait en arrière-plan alors que le bouton
    // était revenu à "Dicter la visite", et sa transcription atterrissait sur
    // la colonie affichée à l'arrivée.
    return () => {
      if (annulerDictee()) dicteeInterrompueRef.current = true;
    };
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

  // Abandonne une dictée en cours sans la transcrire : le handler onstop est
  // détaché d'abord, sinon arrêter le recorder déclencherait quand même la
  // transcription — qui viendrait remplir le formulaire de la colonie
  // affichée à ce moment-là, pas celle qui avait été dictée. Coupe aussi les
  // pistes du stream : sans ça le micro reste ouvert indéfiniment (témoin
  // d'enregistrement allumé), le recorder n'étant plus jamais arrêté.
  // Uniquement des refs, aucun setState : cette fonction sert aussi de
  // nettoyage d'effet, y compris au démontage de l'écran.
  // Renvoie true si une dictée était réellement en cours — l'appelant décide
  // s'il y a lieu d'en informer l'exploitant.
  function annulerDictee() {
    const recorder = mediaRecorderRef.current;
    const interrompue = !!recorder && recorder.state !== 'inactive';
    if (interrompue) {
      recorder.onstop = null;
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current = null;
    streamRef.current = null;
    chunksRef.current = [];
    return interrompue;
  }

  async function demarrerDictee() {
    // Filet de sécurité : jamais deux captures simultanées, la précédente
    // deviendrait orpheline (micro impossible à couper depuis l'UI).
    annulerDictee();
    // Colonie visée par CETTE dictée, figée dès le départ — traiterDictee
    // s'en sert pour détecter un changement de colonie survenu pendant la
    // transcription/structuration (voir son commentaire).
    const colonieIdOrigine = colonieId;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        await traiterDictee(blob, colonieIdOrigine);
      };

      mediaRecorderRef.current = recorder;
      streamRef.current = stream;
      recorder.start();
      setTranscriptionBrute(null);
      setDicteeStatut('enregistrement');
    } catch (err) {
      console.error('[écran B] accès micro refusé', err);
      setDicteeStatut('erreur');
    }
  }

  function arreterDictee() {
    mediaRecorderRef.current?.stop();
  }

  // Une fois l'enregistrement arrêté (bouton ou changement de colonie), la
  // fuite micro est déjà exclue (annulerDictee coupe le stream) — mais rien
  // n'empêchait jusqu'ici l'exploitant de changer de colonie PENDANT la
  // transcription ou la structuration, qui prennent, elles, plusieurs
  // secondes (modèle local + appel réseau). Sans garde-fou, la dictée de la
  // colonie quittée continuait en arrière-plan et sa transcription
  // atterrissait — via modifierChamp/setAnomalies/etc., du simple state React
  // partagé par tout l'écran — dans le formulaire de la colonie affichée à ce
  // moment-là : des valeurs plausibles, appliquées à la mauvaise ruche, sans
  // rien pour les distinguer d'une saisie normale.
  // Comparer colonieIdOrigine (figé à l'appel) à colonieIdRef.current (à
  // jour) après CHAQUE await détecte ce changement, à quelque étape qu'il
  // survienne. Abandon franc dans ce cas — même principe que pendant
  // l'enregistrement (annulerDictee) : rien n'est appliqué à la colonie
  // affichée, et dicteeStatut/message sont remis à un état cohérent pour
  // elle plutôt que de rester bloqués sur "transcription en cours" pour une
  // dictée qui ne la concerne pas.
  function dicteeDevenueObsolete(colonieIdOrigine) {
    if (colonieIdRef.current === colonieIdOrigine) return false;
    setDicteeStatut('inactif');
    setMessage('Dictée interrompue — changement de colonie.');
    return true;
  }

  // Complète le formulaire sans l'écraser : seuls les champs que l'IA a
  // effectivement entendus sont posés (via modifierChamp, comme une saisie
  // manuelle) — tout ce qui n'a pas été dicté garde sa valeur reportée de la
  // visite précédente. C'est le formulaire déjà affiché qui sert de relecture,
  // pas un écran de revue séparé.
  async function traiterDictee(blob, colonieIdOrigine) {
    setDicteeStatut('transcription');
    // @huggingface/transformers exécute l'inférence Whisper en WASM sur le
    // thread principal (pas de Worker) — le calcul peut geler l'interface
    // plusieurs secondes, surtout au premier chargement du modèle (~1 Go en
    // fp32) sur un téléphone. Sans ce point de reprise, le changement de
    // dicteeStatut ci-dessus n'a pas le temps d'être peint à l'écran avant
    // que le blocage ne commence : l'exploitant clique "Arrêter" et ne voit
    // jamais "Transcription en cours…", juste une interface figée sans
    // aucun signal. Un setTimeout(0) laisse le navigateur peindre entre les
    // deux — n'élimine pas le gel pendant l'inférence elle-même (ça
    // demanderait de déporter la pipeline dans un Worker, hors périmètre
    // ici), mais l'exploitant voit au moins que sa dictée a été prise en
    // compte avant que ça bloque.
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      const brut = await transcrire(blob, { onProgres: onProgresModele });
      if (dicteeDevenueObsolete(colonieIdOrigine)) return;
      const corrige = corrigerGlossaire(brut);
      setTranscriptionBrute(corrige);
      setProgresModele(null);
      setDicteeStatut('structuration');
      const champs = await structurerDictee(corrige);
      if (dicteeDevenueObsolete(colonieIdOrigine)) return;

      for (const champ of CHAMPS_REPORTABLES) {
        if (champs[champ] !== undefined && champs[champ] !== null) {
          modifierChamp(champ, champs[champ]);
        }
      }
      if (champs.score_ponte != null) setScorePonte(champs.score_ponte);
      if (champs.anomalies?.length > 0) setAnomalies(champs.anomalies);
      if (champs.observation_libre) setObservationLibre(champs.observation_libre);
      if (champs.traitements?.length > 0) setTraitementsDictes(champs.traitements);
      if (champs.nourrissements?.length > 0) setNourrissementsDictes(champs.nourrissements);

      setDicteeStatut('inactif');
    } catch (err) {
      if (dicteeDevenueObsolete(colonieIdOrigine)) return;
      console.error('[écran B] échec de la dictée', err);
      setDicteeStatut('erreur');
    }
  }

  // La pipeline de transcription émet des événements de progression, pas un
  // pourcentage — même normalisation que TourneeVocale.jsx, sans quoi
  // l'objet brut atterrit dans l'affichage ("[object Object]%").
  function onProgresModele(evenement) {
    if (evenement?.status === 'progress' && evenement.total) {
      setProgresModele(Math.round((evenement.loaded / evenement.total) * 100));
    } else if (evenement?.status === 'done') {
      setProgresModele(null);
    }
  }

  function retirerTraitementDicte(index) {
    setTraitementsDictes((liste) => liste.filter((_, i) => i !== index));
  }

  function retirerNourrissementDicte(index) {
    setNourrissementsDictes((liste) => liste.filter((_, i) => i !== index));
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
  const joursDepuisVisite = derniereVisite ? joursDepuis(derniereVisite.date) : null;
  const contexteSaisieVisite = `${positionTournee ? `Position ${positionTournee} · ` : ''}${anciennete(joursDepuisVisite)}`;

  async function construireVisite() {
    const maintenant = new Date();
    // Extension F2.4 (15/08/2026) : relevé extérieur de la station Netatmo
    // personnelle, uniquement si ce rucher est celui où elle se trouve —
    // capturerMeteoDomicileSiApplicable ne lève jamais, renvoie null sinon.
    const meteoDomicile = await capturerMeteoDomicileSiApplicable(contexteActuel?.rucher?.id);
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
      hausses_posees: haussesPosees,
      anomalies,
      score_ponte: scorePonte ?? null,
      signes_sanitaires: signesSanitaires,
      suspicion_reglementee: suspicionReglementee,
      source_agregats: 'saisie_directe',
      observation_libre: observationLibre || null,
      meteo_domicile: meteoDomicile,
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

  // Comprimées dès l'ajout (pas à l'enregistrement) : l'aperçu affiché est
  // déjà la version qui sera stockée, pas de surprise de taille après coup.
  async function ajouterPhotos(fichiers) {
    setCompressionEnCours(true);
    try {
      const nouvelles = [];
      for (const fichier of Array.from(fichiers)) {
        const blob = await comprimerImage(fichier);
        nouvelles.push({ blob, url: URL.createObjectURL(blob) });
      }
      setPhotosEnAttente((p) => [...p, ...nouvelles]);
    } finally {
      setCompressionEnCours(false);
    }
  }

  function retirerPhoto(index) {
    setPhotosEnAttente((p) => {
      URL.revokeObjectURL(p[index].url);
      return p.filter((_, i) => i !== index);
    });
  }

  // Rien n'est persisté avant l'enregistrement effectif de la visite (brief
  // §4, F2.3) : les photos restent en mémoire (Blob + URL locale) jusqu'ici,
  // évitant toute ligne `photo` orpheline si l'utilisateur quitte l'écran
  // sans enregistrer.
  async function enregistrerPhotosEnAttente(visiteId) {
    for (const photo of photosEnAttente) {
      await enregistrerPhoto({ visiteId, blob: photo.blob });
      URL.revokeObjectURL(photo.url);
    }
    setPhotosEnAttente([]);
  }

  // Traitements/nourrissements détectés par la dictée (§ traiterDictee) —
  // même construction que RevueTournee.jsx : la dictée ne fournit que
  // produit/voie/dosage/motif ou type/quantite/unite/composition, le reste
  // des champs du schéma reste à null, faute d'avoir été dit.
  async function enregistrerTraitementsEtNourrissementsDictes(visite) {
    for (const t of traitementsDictes) {
      const maintenant = new Date().toISOString();
      await enregistrerTraitement({
        id: crypto.randomUUID(),
        colonie_id: visite.colonie_id,
        date_debut: visite.date.slice(0, 10),
        date_fin: visite.date.slice(0, 10),
        produit: t.produit || null,
        numero_amm: null,
        numero_lot: null,
        dosage: t.dosage || null,
        voie: t.voie || null,
        motif: t.motif || null,
        delai_attente_jours: null,
        date_fin_delai_attente: null,
        ordonnance_document_id: null,
        conforme_bio: null,
        notes: null,
        created_at: maintenant,
        updated_at: maintenant,
        deleted_at: null,
      });
    }
    for (const n of nourrissementsDictes) {
      const maintenant = new Date().toISOString();
      await enregistrerNourrissement({
        id: crypto.randomUUID(),
        colonie_id: visite.colonie_id,
        date: visite.date.slice(0, 10),
        type: n.type || null,
        quantite: n.quantite ?? null,
        unite: n.unite || null,
        composition: n.composition || null,
        origine_produit: null,
        notes: null,
        created_at: maintenant,
        updated_at: maintenant,
        deleted_at: null,
      });
    }
    setTraitementsDictes([]);
    setNourrissementsDictes([]);
  }

  async function enregistrer() {
    if (!colonieId) return;
    try {
      const visite = await construireVisite();
      await enregistrerVisite(visite);
      await creerTacheSuspicionSiNecessaire(visite, {
        rucherId: contexteActuel?.rucher?.id ?? null,
        rucheNumero: contexteActuel?.ruche?.numero,
      });
      await creerRappelsInterventionSiNecessaire(visite, {
        rucherId: contexteActuel?.rucher?.id ?? null,
        cadreCouvainIntroduit,
      });
      await enregistrerPhotosEnAttente(visite.id);
      await enregistrerTraitementsEtNourrissementsDictes(visite);
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
      await creerTacheSuspicionSiNecessaire(visite, {
        rucherId: contexteActuel?.rucher?.id ?? null,
        rucheNumero: contexteActuel?.ruche?.numero,
      });
      await creerRappelsInterventionSiNecessaire(visite, {
        rucherId: contexteActuel?.rucher?.id ?? null,
        cadreCouvainIntroduit,
      });
      await enregistrerPhotosEnAttente(visite.id);
      await enregistrerTraitementsEtNourrissementsDictes(visite);
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
    <div className="min-h-screen bg-ground text-ink flex flex-col max-w-md mx-auto">
      <EnTeteEcran
        retourLibelle="← Tournée"
        onRetour={onRetour}
        titre={
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
        }
        contexte={contexteSaisieVisite}
      />

      <div className="p-4 flex flex-col gap-4">

      <section className="flex flex-col gap-2">
        <button
          type="button"
          onClick={dicteeStatut === 'enregistrement' ? arreterDictee : demarrerDictee}
          disabled={dicteeStatut === 'transcription' || dicteeStatut === 'structuration'}
          className={`h-11 w-full rounded text-15 font-bold ${
            dicteeStatut === 'enregistrement'
              ? 'bg-urgent-ink text-surface'
              : 'bg-ink text-surface disabled:opacity-40'
          }`}
        >
          {dicteeStatut === 'enregistrement' ? '■ Arrêter' : '● Dicter la visite'}
        </button>
        {dicteeStatut === 'transcription' && (
          <p className="text-11 text-ink-muted">
            Transcription en cours…
            {progresModele != null && ` Téléchargement du modèle (une seule fois) : ${progresModele}%`}
          </p>
        )}
        {dicteeStatut === 'structuration' && (
          <p className="text-11 text-ink-muted">Structuration en cours…</p>
        )}
        {dicteeStatut === 'erreur' && (
          <p className="text-11 text-urgent-ink">
            Échec — micro refusé, ou dictée impossible hors-ligne avant le premier téléchargement
            du modèle et sans réseau pour la structuration.
          </p>
        )}
        {transcriptionBrute && (
          <p className="text-12 text-ink-secondary italic">« {transcriptionBrute} »</p>
        )}

        {traitementsDictes.length > 0 && (
          <div className="border border-rule rounded p-3 flex flex-col gap-2">
            <p className="text-13 font-bold text-ink-secondary">Traitement(s) détecté(s) dans la dictée</p>
            {traitementsDictes.map((t, index) => (
              <div key={index} className="flex items-start justify-between gap-2 text-13">
                <span>
                  {t.produit || 'Produit non précisé'}
                  {t.voie && ` — ${VOIE_LIBELLES[t.voie] ?? t.voie}`}
                  {t.dosage && ` — ${t.dosage}`}
                </span>
                <button
                  type="button"
                  onClick={() => retirerTraitementDicte(index)}
                  className="text-12 text-ink-secondary underline shrink-0"
                >
                  Retirer
                </button>
              </div>
            ))}
          </div>
        )}

        {nourrissementsDictes.length > 0 && (
          <div className="border border-rule rounded p-3 flex flex-col gap-2">
            <p className="text-13 font-bold text-ink-secondary">Nourrissement(s) détecté(s) dans la dictée</p>
            {nourrissementsDictes.map((n, index) => (
              <div key={index} className="flex items-start justify-between gap-2 text-13">
                <span>
                  {n.type ? TYPE_NOURRISSEMENT_LIBELLES[n.type] ?? n.type : 'Type non précisé'}
                  {n.quantite != null && ` — ${n.quantite}${n.unite ? ` ${n.unite}` : ''}`}
                  {n.composition && ` (${n.composition})`}
                </span>
                <button
                  type="button"
                  onClick={() => retirerNourrissementDicte(index)}
                  className="text-12 text-ink-secondary underline shrink-0"
                >
                  Retirer
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Mosaïque d'accès rapide (retour d'usage réel du 14/08/2026) : ces
          quatre écrans étaient injoignables sans défiler tout le formulaire
          — remontés ici, en tuiles colorées, plutôt qu'en liens perdus en
          pied d'écran. */}
      <section className="grid grid-cols-2 gap-2">
        {onOuvrirSanitaire && colonieId && (
          <button
            type="button"
            onClick={() => onOuvrirSanitaire(colonieId)}
            className="h-16 rounded bg-bordeaux text-surface text-13 font-bold flex items-center justify-center text-center px-2"
          >
            Sanitaire
          </button>
        )}
        {onOuvrirRecolte && colonieId && (
          <button
            type="button"
            onClick={() => onOuvrirRecolte(colonieId)}
            className="h-16 rounded bg-miel text-ink text-13 font-bold flex items-center justify-center text-center px-2"
          >
            Récoltes
          </button>
        )}
        {onOuvrirMouvement && colonieId && (
          <button
            type="button"
            onClick={() => onOuvrirMouvement(colonieId)}
            className="h-16 rounded bg-vert text-surface text-13 font-bold flex items-center justify-center text-center px-2"
          >
            Mouvements
          </button>
        )}
        {/* Une observation cadre par cadre se rattache à une visite déjà
            enregistrée (visite_id requis) — n'apparaît qu'une fois qu'il y
            en a une pour cette colonie, la dernière en date. */}
        {onOuvrirObservationCadre && derniereVisite && (
          <button
            type="button"
            onClick={() => onOuvrirObservationCadre(derniereVisite.id, colonieId)}
            className="h-16 rounded bg-ink text-surface text-13 font-bold flex items-center justify-center text-center px-2"
          >
            Cadre par cadre
          </button>
        )}
      </section>

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
        <button
          type="button"
          onClick={() => setColonieOuverte((v) => !v)}
          className="text-13 font-bold text-ink-secondary text-left"
        >
          {colonieOuverte ? '▾' : '▸'} Colonie
        </button>
        {colonieOuverte && (
          <>
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
          </>
        )}
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
        {/* Action de cette visite (§6.3 : déclenche le rappel de contrôle du
            remplissage), jamais reportée — provenance forcée à "saisi" pour
            ne jamais afficher "non observé" sur une simple action booléenne. */}
        <Interrupteur label="Hausse posée" value={haussesPosees} provenance="saisi" onChange={setHaussesPosees} />
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
        {(anomalies.includes('orpheline') || anomalies.includes('bourdonneuse')) && (
          <div className="mt-2">
            <Interrupteur
              label="Cadre de couvain frais introduit"
              value={cadreCouvainIntroduit}
              provenance="saisi"
              onChange={setCadreCouvainIntroduit}
            />
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
        <p className="text-13 text-ink-secondary mb-1">
          Photos{photosEnAttente.length > 0 && ` (${photosEnAttente.length})`}
        </p>
        {photosEnAttente.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {photosEnAttente.map((photo, index) => (
              <div key={photo.url} className="relative w-16 h-16">
                <img
                  src={photo.url}
                  alt=""
                  className="w-16 h-16 object-cover rounded border border-rule-strong"
                />
                <button
                  type="button"
                  onClick={() => retirerPhoto(index)}
                  aria-label="retirer la photo"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-ink text-surface text-11 leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <label className="inline-block h-10 px-3 rounded bg-surface border border-rule-strong text-ink text-13 font-bold leading-10 cursor-pointer">
          {compressionEnCours ? 'Compression…' : '+ Ajouter une photo'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            disabled={compressionEnCours}
            onChange={(e) => {
              if (e.target.files.length > 0) ajouterPhotos(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
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
        className="h-[46px] w-full rounded bg-miel text-ink text-15 font-bold"
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
    </div>
  );
}
