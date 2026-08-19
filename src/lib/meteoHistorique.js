// L3bis (brief_L3bis_moteur_regles.md §4, §5, L3b.1) : reconstitution de
// l'historique météo observé d'un rucher, base des agrégats du moteur de
// règles. Distinct de src/lib/meteo.js (prévisions, F8.1-F8.3) — même
// fournisseur (Open-Meteo, gratuit, sans clé), mais l'API d'archive plutôt
// que l'API de prévision, et un jour observé n'est jamais une prévision.
const BASE_URL_ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';

const VARIABLES_JOUR = [
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'wind_speed_10m_mean',
  'relative_humidity_2m_mean',
];

// L'archive Open-Meteo a un délai de quelques jours (les modèles de
// réanalyse ne sont pas instantanés) — demander jusqu'à aujourd'hui
// renverrait des jours à null en fin de période. Les derniers jours
// manquants se rattrapent au rafraîchissement quotidien suivant (§9 étape
// 2), une fois l'archive à jour.
const DELAI_ARCHIVE_JOURS = 5;

function dateIsoMoinsJours(jours) {
  const d = new Date();
  d.setDate(d.getDate() - jours);
  return d.toISOString().slice(0, 10);
}

// `dateDebut`/`dateFin` au format YYYY-MM-DD. Renvoie un tableau de lignes
// prêtes à être stockées dans meteo_journaliere (sans rucher_id, à ajouter
// par l'appelant) — un jour sans donnée (ex. trop récent) est omis plutôt
// que renvoyé avec des null, pour ne jamais écraser une ligne déjà connue
// par une ligne vide lors d'un upsert.
export async function recupererHistoriqueArchive(latitude, longitude, dateDebut, dateFin) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    start_date: dateDebut,
    end_date: dateFin,
    daily: VARIABLES_JOUR.join(','),
    timezone: 'auto',
  });
  const reponse = await fetch(`${BASE_URL_ARCHIVE}?${params.toString()}`);
  if (!reponse.ok) {
    throw new Error(`Échec de la récupération de l'historique météo (HTTP ${reponse.status})`);
  }
  const donnees = await reponse.json();
  return construireHistoriqueJournalier(donnees);
}

function construireHistoriqueJournalier(donnees) {
  const j = donnees.daily;
  if (!j?.time) return [];
  const lignes = [];
  for (let i = 0; i < j.time.length; i++) {
    const tMax = j.temperature_2m_max?.[i];
    const tMin = j.temperature_2m_min?.[i];
    if (tMax == null || tMin == null) continue; // jour non disponible dans l'archive
    lignes.push({
      date: j.time[i],
      t_min: tMin,
      t_max: tMax,
      precipitations_mm: j.precipitation_sum?.[i] ?? null,
      vent_moyen: j.wind_speed_10m_mean?.[i] ?? null,
      humidite: j.relative_humidity_2m_mean?.[i] ?? null,
      source: 'archive',
      type: 'observe',
    });
  }
  return lignes;
}

// Reconstitue au moins douze mois d'historique (critère d'acceptation §10
// point 1) — 400 jours en arrière par défaut pour couvrir une année pleine
// même en tenant compte du délai de l'archive.
const JOURS_HISTORIQUE_PAR_DEFAUT = 400;

export async function reconstituerHistorique(latitude, longitude, joursEnArriere = JOURS_HISTORIQUE_PAR_DEFAUT) {
  const dateDebut = dateIsoMoinsJours(joursEnArriere);
  const dateFin = dateIsoMoinsJours(DELAI_ARCHIVE_JOURS);
  return recupererHistoriqueArchive(latitude, longitude, dateDebut, dateFin);
}
