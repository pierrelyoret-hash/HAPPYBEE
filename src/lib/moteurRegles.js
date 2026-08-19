import { listerReglesActives } from '../db/repositories/regles.js';
import { obtenirHistoriqueRucher } from '../db/repositories/meteoJournaliere.js';
import { creerRecommandationSiNouvelle } from '../db/repositories/recommandations.js';
import { detecterCanicule, SEUILS_PAR_DEFAUT } from './agregatsMeteo.js';

// L3bis (brief §9 étape 4) : moteur d'évaluation, une seule règle pilote
// pour l'instant (R-CLIM-01) — le catalogue complet (§2.2, 9 règles) vient
// à l'étape 5, chacune ajoutant sa propre fonction d'évaluation ici,
// dispatchée par regle.declencheur.agregat.
//
// Un épisode n'est "actuel" que si son dernier jour touche la fin de
// l'historique connu (à J ou J-1 — l'archive peut avoir un jour de retard
// ponctuel sans que l'épisode soit pour autant terminé) : un vieil épisode
// de canicule d'il y a deux mois, présent dans l'historique reconstitué,
// ne doit jamais re-générer une recommandation.
function estEpisodeActuel(episode, dernierJourConnu) {
  if (!dernierJourConnu) return false;
  const jourSuivantEpisode = new Date(episode.dateFin);
  jourSuivantEpisode.setDate(jourSuivantEpisode.getDate() + 1);
  const ecartJours = Math.round(
    (new Date(dernierJourConnu) - new Date(episode.dateFin)) / (1000 * 60 * 60 * 24)
  );
  return ecartJours <= 1;
}

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

// Table de dispatch agregat → évaluateur — étendue à l'étape 5 avec les
// huit autres règles du catalogue (§2.2).
const EVALUATEURS_PAR_AGREGAT = {
  canicule: evaluerCanicule,
};

// Évalue toutes les règles actives pour un rucher et crée les
// recommandations nouvelles (creerRecommandationSiNouvelle gère elle-même
// la déduplication par épisode et le plafond d'urgentes). Purement local :
// aucun appel réseau, F12.7 — jours doit déjà être en base
// (meteo_journaliere), reconstituée/rafraîchie séparément.
export async function evaluerRucher(rucher) {
  if (rucher?.latitude == null || rucher?.longitude == null) return [];
  const regles = await listerReglesActives();
  if (regles.length === 0) return [];

  // Une seule lecture de l'historique, bornée à une fenêtre large (400 j)
  // suffisante pour tous les agrégats actuels (secheresse en a besoin le
  // plus, sur 30 jours glissants) — évite une requête par règle.
  const dateFin = new Date().toISOString().slice(0, 10);
  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() - 400);
  const jours = await obtenirHistoriqueRucher(rucher.id, dateDebut.toISOString().slice(0, 10), dateFin);

  const recommandationsCreees = [];
  for (const regle of regles) {
    const evaluateur = EVALUATEURS_PAR_AGREGAT[regle.declencheur?.agregat];
    if (!evaluateur) continue;
    const recommandation = await evaluateur(regle, rucher, jours);
    if (recommandation) recommandationsCreees.push(recommandation);
  }
  return recommandationsCreees;
}
