import { listerReglesActives } from '../db/repositories/regles.js';
import { obtenirHistoriqueRucher } from '../db/repositories/meteoJournaliere.js';
import { creerRecommandationSiNouvelle } from '../db/repositories/recommandations.js';
import { listerColoniesActives } from '../db/repositories/colonies.js';
import { obtenirDerniereVisite } from '../db/repositories/visites.js';
import { obtenirDernierComptageVarroa } from '../db/repositories/sanitaire.js';
import {
  detecterCanicule,
  detecterSecheresse,
  estFenetreVisiteFavorable,
  SEUILS_PAR_DEFAUT,
} from './agregatsMeteo.js';
import { joursDepuis, SEUIL_JOURS_A_VISITER } from './etats.js';

// L3bis (brief §9 étapes 4-5) : moteur d'évaluation. Deux portées de règle
// (regle.portee) :
// - "rucher" : une évaluation par rucher, sur son historique météo partagé.
// - "colonie" : une évaluation par colonie active du rucher (l'historique
//   météo, quand la règle en a besoin, reste celui du rucher — partagé,
//   récupéré une seule fois, pas par colonie).
// Chaque règle est dispatchée par son code d'agrégat/cible (declencheur.agregat
// pour type "agregat", declencheur.cible pour type "absence") vers sa
// fonction d'évaluation ci-dessous.

// Un épisode n'est "actuel" que si son dernier jour touche la fin de
// l'historique connu (à J ou J-1 — l'archive peut avoir un jour de retard
// ponctuel sans que l'épisode soit pour autant terminé) : un vieil épisode
// de canicule d'il y a deux mois, présent dans l'historique reconstitué,
// ne doit jamais re-générer une recommandation.
function estEpisodeActuel(episode, dernierJourConnu) {
  if (!dernierJourConnu) return false;
  const ecartJours = Math.round(
    (new Date(dernierJourConnu) - new Date(episode.dateFin)) / (1000 * 60 * 60 * 24)
  );
  return ecartJours <= 1;
}

// ---- Évaluateurs de portée "rucher" ----

async function evaluerCanicule(regle, rucher, jours) {
  if (jours.length === 0) return null;
  const seuils = regle.parametres_utilisateur ?? SEUILS_PAR_DEFAUT.canicule;
  const episodes = detecterCanicule(jours, seuils);
  if (episodes.length === 0) return null;

  const dernierJourConnu = jours[jours.length - 1].date;
  const episode = episodes[episodes.length - 1];
  if (!estEpisodeActuel(episode, dernierJourConnu)) return null;

  const enonce = regle.enonce_modele
    .replace('{tMaxMin}', String(seuils.tMaxMin))
    .replace('{dureeJours}', String(episode.dureeJours));

  return creerRecommandationSiNouvelle({
    regle,
    rucherId: rucher.id,
    enonce,
    donneesDeclenchement: { agregat: 'canicule', ...episode, seuils },
  });
}

const EVALUATEURS_RUCHER = {
  'agregat:canicule': evaluerCanicule,
};

// ---- Évaluateurs de portée "colonie" ----

// jours : historique météo du RUCHER (partagé entre les colonies qu'il
// contient) — cette règle croise un signal météo commun avec un état
// (retard de visite) propre à chaque colonie.
async function evaluerFenetreVisiteRetard(regle, rucher, colonie, jours) {
  if (jours.length === 0) return null;
  const dernierJour = jours[jours.length - 1];
  const seuils = regle.parametres_utilisateur ?? SEUILS_PAR_DEFAUT.fenetreVisite;
  if (!estFenetreVisiteFavorable(dernierJour, seuils)) return null;

  const derniereVisite = await obtenirDerniereVisite(colonie.id);
  const joursDepuisVisite = derniereVisite ? joursDepuis(derniereVisite.date) : null;
  // Même seuil que l'état "à visiter" existant (src/lib/etats.js) — la
  // règle ne fait qu'ajouter "et aujourd'hui est un bon jour pour s'y
  // mettre" à un retard déjà signalé ailleurs dans l'application.
  if (joursDepuisVisite == null || joursDepuisVisite <= SEUIL_JOURS_A_VISITER) return null;

  const enonce = regle.enonce_modele.replace('{joursDepuisVisite}', String(joursDepuisVisite));

  return creerRecommandationSiNouvelle({
    regle,
    colonieId: colonie.id,
    rucherId: rucher.id,
    enonce,
    // dateDebut = aujourd'hui : un signal par nature quotidien (le créneau
    // change tous les jours), à la différence d'un épisode météo qui dure
    // plusieurs jours — assumé, pas d'anti-doublon au-delà du jour même.
    donneesDeclenchement: { agregat: 'fenetreVisiteRetard', dateDebut: dernierJour.date, joursDepuisVisite, jourMeteo: dernierJour },
  });
}

async function evaluerAbsenceComptageVarroa(regle, rucher, colonie) {
  const fenetre = regle.fenetre_saisonniere;
  if (fenetre) {
    const mois = new Date().getMonth() + 1;
    if (mois < fenetre.moisDebut || mois > fenetre.moisFin) return null;
  }

  const seuilJours = regle.declencheur.seuilJours;
  const dernier = await obtenirDernierComptageVarroa(colonie.id);
  const joursDepuisComptage = dernier ? joursDepuis(dernier.date) : null;
  if (joursDepuisComptage != null && joursDepuisComptage <= seuilJours) return null;

  const enonce = regle.enonce_modele.replace('{seuilJours}', String(seuilJours));

  return creerRecommandationSiNouvelle({
    regle,
    colonieId: colonie.id,
    rucherId: rucher.id,
    enonce,
    // dateDebut stable tant qu'aucun nouveau comptage n'est saisi (le
    // dernier comptage connu, ou un marqueur fixe si aucun n'existe jamais)
    // — sans quoi la recommandation se recréerait chaque jour tant que le
    // silence dure, à l'inverse de fenetreVisiteRetard ci-dessus.
    donneesDeclenchement: { absence: 'comptage_varroa', dateDebut: dernier?.date ?? 'jamais_compte', joursDepuisComptage, seuilJours },
  });
}

// Provisions faibles : seuil par défaut du catalogue (regle.parametres_defaut),
// surchargeable par regle.parametres_utilisateur (F12.8/F12.9) — jamais en
// dur ici. Lit le dernier visite.nb_cadres_provisions connu ; une colonie
// jamais visitée (derniereVisite null) ne déclenche pas, faute de donnée
// exploitable — absence de donnée n'est pas "provisions faibles".
async function obtenirProvisionsFaibles(colonie, regle) {
  const seuils = regle.parametres_utilisateur ?? regle.parametres_defaut;
  const derniereVisite = await obtenirDerniereVisite(colonie.id);
  const provisions = derniereVisite?.nb_cadres_provisions;
  if (provisions == null) return null;
  if (provisions > seuils.provisionsFaiblesMaxCadres) return null;
  return provisions;
}

// R-NOUR-01 : canicule ET sécheresse (rucher) ET provisions faibles
// (colonie) — les trois combinées, cf. commentaire du catalogue sur la
// lecture du "+" comme un ET.
async function evaluerCaniculeSechresseProvisions(regle, rucher, colonie, jours) {
  if (jours.length === 0) return null;
  const dernierJourConnu = jours[jours.length - 1].date;

  const episodesCanicule = detecterCanicule(jours, SEUILS_PAR_DEFAUT.canicule);
  const caniculeActuelle = episodesCanicule.some((e) => estEpisodeActuel(e, dernierJourConnu));
  if (!caniculeActuelle) return null;

  const episodesSecheresse = detecterSecheresse(jours, SEUILS_PAR_DEFAUT.secheresse);
  const secheresseActuelle = episodesSecheresse.some((s) => s.date === dernierJourConnu);
  if (!secheresseActuelle) return null;

  const provisions = await obtenirProvisionsFaibles(colonie, regle);
  if (provisions == null) return null;

  const enonce = regle.enonce_modele.replace('{provisions}', String(provisions));

  return creerRecommandationSiNouvelle({
    regle,
    colonieId: colonie.id,
    rucherId: rucher.id,
    // dateDebut = jour courant : recalculé chaque jour tant que les trois
    // conditions restent réunies (comme fenetreVisiteRetard) — la
    // combinaison peut légitimement se répéter sur des épisodes distincts.
    enonce,
    donneesDeclenchement: { agregats: ['canicule', 'secheresse'], dateDebut: dernierJourConnu, provisions },
  });
}

// R-NOUR-02 : provisions faibles à l'entrée de l'hivernage (fenêtre
// saisonnière portée par regle.fenetre_saisonniere, vérifiée ici).
async function evaluerProvisionsHivernage(regle, rucher, colonie) {
  const fenetre = regle.fenetre_saisonniere;
  const mois = new Date().getMonth() + 1;
  if (fenetre && (mois < fenetre.moisDebut || mois > fenetre.moisFin)) return null;

  const provisions = await obtenirProvisionsFaibles(colonie, regle);
  if (provisions == null) return null;

  const enonce = regle.enonce_modele.replace('{provisions}', String(provisions));
  const anneeCourante = new Date().getFullYear();

  return creerRecommandationSiNouvelle({
    regle,
    colonieId: colonie.id,
    rucherId: rucher.id,
    enonce,
    // dateDebut ancré à l'année : une seule recommandation par entrée
    // d'hivernage, pas une par jour du mois — la situation ne "redevient
    // pas nouvelle" chaque jour d'octobre.
    donneesDeclenchement: { etat: 'provisions_hivernage', dateDebut: `hivernage-${anneeCourante}`, provisions },
  });
}

// R-ESSA-02 : colonie forte (cadres de couvain) + hausse bien remplie
// (cadres de provisions) → poser une hausse.
async function evaluerColonieForteHaussePleine(regle, rucher, colonie) {
  const seuils = regle.parametres_utilisateur ?? regle.parametres_defaut;
  const derniereVisite = await obtenirDerniereVisite(colonie.id);
  const couvain = derniereVisite?.nb_cadres_couvain_opercule;
  const provisions = derniereVisite?.nb_cadres_provisions;
  if (couvain == null || provisions == null) return null;
  if (couvain < seuils.forceMinCadres || provisions < seuils.hausseMinCadres) return null;

  const enonce = regle.enonce_modele
    .replace('{couvain}', String(couvain))
    .replace('{provisions}', String(provisions));

  return creerRecommandationSiNouvelle({
    regle,
    colonieId: colonie.id,
    rucherId: rucher.id,
    enonce,
    // dateDebut = date de la visite déclenchante : stable tant que cette
    // visite reste la plus récente, se renouvelle naturellement si une
    // visite suivante confirme à nouveau l'état (nouvelle date).
    donneesDeclenchement: { etat: 'colonie_forte_hausse_pleine', dateDebut: derniereVisite.date, couvain, provisions },
  });
}

const EVALUATEURS_COLONIE = {
  'agregat:fenetreVisiteRetard': evaluerFenetreVisiteRetard,
  'absence:comptage_varroa': evaluerAbsenceComptageVarroa,
  'agregat_et_etat:_': evaluerCaniculeSechresseProvisions,
  'etat:_': evaluerProvisionsHivernage,
  'etat_double:_': evaluerColonieForteHaussePleine,
};

// ---- Évaluateurs de portée "exploitation" (une seule évaluation globale,
// jamais répétée par rucher ni par colonie — ex. une obligation
// réglementaire qui ne dépend d'aucun des deux) ----

async function evaluerDeclarationAnnuelle(regle) {
  const fenetre = regle.fenetre_saisonniere;
  const mois = new Date().getMonth() + 1;
  if (fenetre && (mois < fenetre.moisDebut || mois > fenetre.moisFin)) return null;

  const anneeCourante = new Date().getFullYear();
  return creerRecommandationSiNouvelle({
    regle,
    enonce: regle.enonce_modele,
    // Une seule fois par année civile — la fenêtre dure plusieurs mois,
    // pas une recommandation par jour de la fenêtre.
    donneesDeclenchement: { calendrier: 'declaration_annuelle', dateDebut: `declaration-${anneeCourante}` },
  });
}

const EVALUATEURS_EXPLOITATION = {
  'calendrier:_': evaluerDeclarationAnnuelle,
};

// ---- Évaluateurs déclenchés par un événement de visite (R-ORPH-01) ----
//
// Contrairement à tout ce qui précède (balayage périodique de l'état
// accumulé), ceux-ci réagissent à UN événement précis — une anomalie vient
// d'être cochée sur une visite qu'on est en train d'enregistrer. Appelés
// depuis src/lib/reglesVisite.js, pas depuis evaluerRucher.

async function evaluerBourdonneuse(regle, visite, rucherId) {
  if (!visite.anomalies?.includes('bourdonneuse')) return null;
  return creerRecommandationSiNouvelle({
    regle,
    colonieId: visite.colonie_id,
    rucherId,
    enonce: regle.enonce_modele,
    // dateDebut = id de la visite déclenchante : chaque visite bourdonneuse
    // est un événement distinct (contrairement aux règles météo/état qui
    // décrivent une situation continue) — deux visites bourdonneuses
    // consécutives sur la même colonie produisent donc bien deux
    // recommandations, pas une seule réutilisée.
    donneesDeclenchement: { anomalie: 'bourdonneuse', dateDebut: visite.id, visiteId: visite.id },
  });
}

const EVALUATEURS_VISITE = {
  'anomalie_visite:bourdonneuse': evaluerBourdonneuse,
};

function cleDispatch(declencheur) {
  const secondaire = declencheur?.agregat ?? declencheur?.cible ?? declencheur?.anomalie ?? '_';
  return `${declencheur?.type}:${secondaire}`;
}

// À appeler à l'enregistrement d'une visite (voir src/lib/reglesVisite.js),
// une fois par visite — jamais par le balayage périodique evaluerRucher.
export async function evaluerVisite(visite, rucherId) {
  const regles = (await listerReglesActives()).filter((r) => r.declencheur?.type === 'anomalie_visite');
  const recommandationsCreees = [];
  for (const regle of regles) {
    const evaluateur = EVALUATEURS_VISITE[cleDispatch(regle.declencheur)];
    if (!evaluateur) continue;
    const recommandation = await evaluateur(regle, visite, rucherId);
    if (recommandation) recommandationsCreees.push(recommandation);
  }
  return recommandationsCreees;
}

// À appeler une fois par évaluation globale (indépendamment des ruchers) —
// contrairement à evaluerRucher, appelée une fois par rucher.
export async function evaluerExploitation() {
  const regles = (await listerReglesActives()).filter((r) => r.portee === 'exploitation');
  const recommandationsCreees = [];
  for (const regle of regles) {
    const evaluateur = EVALUATEURS_EXPLOITATION[cleDispatch(regle.declencheur)];
    if (!evaluateur) continue;
    const recommandation = await evaluateur(regle);
    if (recommandation) recommandationsCreees.push(recommandation);
  }
  return recommandationsCreees;
}

// Évalue toutes les règles actives pour un rucher (portée "rucher") et pour
// chacune de ses colonies actives (portée "colonie"), et crée les
// recommandations nouvelles (creerRecommandationSiNouvelle gère elle-même
// la déduplication par épisode et le plafond d'urgentes). Purement local :
// aucun appel réseau, F12.7.
//
// L'historique météo est optionnel selon la règle (R-VARR-03 n'en a pas
// besoin) : un rucher sans coordonnées ne bloque donc que les règles
// météo-dépendantes, jamais les autres.
export async function evaluerRucher(rucher) {
  const regles = await listerReglesActives();
  if (regles.length === 0) return [];

  let jours = [];
  if (rucher?.latitude != null && rucher?.longitude != null) {
    const dateFin = new Date().toISOString().slice(0, 10);
    const dateDebut = new Date();
    dateDebut.setDate(dateDebut.getDate() - 400);
    jours = await obtenirHistoriqueRucher(rucher.id, dateDebut.toISOString().slice(0, 10), dateFin);
  }

  const reglesRucher = regles.filter((r) => r.portee === 'rucher');
  const reglesColonie = regles.filter((r) => r.portee === 'colonie');

  const recommandationsCreees = [];

  for (const regle of reglesRucher) {
    const evaluateur = EVALUATEURS_RUCHER[cleDispatch(regle.declencheur)];
    if (!evaluateur) continue;
    const recommandation = await evaluateur(regle, rucher, jours);
    if (recommandation) recommandationsCreees.push(recommandation);
  }

  if (reglesColonie.length > 0) {
    const toutesColonies = await listerColoniesActives();
    const coloniesDuRucher = toutesColonies.filter((c) => c.rucher.id === rucher.id);
    for (const { colonie } of coloniesDuRucher) {
      for (const regle of reglesColonie) {
        const evaluateur = EVALUATEURS_COLONIE[cleDispatch(regle.declencheur)];
        if (!evaluateur) continue;
        const recommandation = await evaluateur(regle, rucher, colonie, jours);
        if (recommandation) recommandationsCreees.push(recommandation);
      }
    }
  }

  return recommandationsCreees;
}
