const BASE_URL = 'https://api.open-meteo.com/v1/forecast';

const VARIABLES_JOUR = [
  'weathercode',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'precipitation_probability_max',
  'wind_speed_10m_max',
];

// Codes WMO retournés par Open-Meteo (table officielle, sous-ensemble
// pertinent pour un usage apicole terrain — pas besoin des ~30 nuances).
const LIBELLES_CODE_METEO = {
  0: { libelle: 'Ciel dégagé', emoji: '☀️' },
  1: { libelle: 'Peu nuageux', emoji: '🌤️' },
  2: { libelle: 'Partiellement nuageux', emoji: '⛅' },
  3: { libelle: 'Couvert', emoji: '☁️' },
  45: { libelle: 'Brouillard', emoji: '🌫️' },
  48: { libelle: 'Brouillard givrant', emoji: '🌫️' },
  51: { libelle: 'Bruine légère', emoji: '🌦️' },
  53: { libelle: 'Bruine', emoji: '🌦️' },
  55: { libelle: 'Bruine forte', emoji: '🌦️' },
  56: { libelle: 'Bruine verglaçante', emoji: '🌧️' },
  57: { libelle: 'Bruine verglaçante forte', emoji: '🌧️' },
  61: { libelle: 'Pluie légère', emoji: '🌧️' },
  63: { libelle: 'Pluie', emoji: '🌧️' },
  65: { libelle: 'Pluie forte', emoji: '🌧️' },
  66: { libelle: 'Pluie verglaçante', emoji: '🌧️' },
  67: { libelle: 'Pluie verglaçante forte', emoji: '🌧️' },
  71: { libelle: 'Neige légère', emoji: '🌨️' },
  73: { libelle: 'Neige', emoji: '🌨️' },
  75: { libelle: 'Neige forte', emoji: '🌨️' },
  77: { libelle: 'Grains de neige', emoji: '🌨️' },
  80: { libelle: 'Averses légères', emoji: '🌦️' },
  81: { libelle: 'Averses', emoji: '🌦️' },
  82: { libelle: 'Averses violentes', emoji: '🌦️' },
  85: { libelle: 'Averses de neige', emoji: '🌨️' },
  86: { libelle: 'Averses de neige fortes', emoji: '🌨️' },
  95: { libelle: 'Orage', emoji: '⛈️' },
  96: { libelle: 'Orage avec grêle', emoji: '⛈️' },
  99: { libelle: 'Orage avec grêle forte', emoji: '⛈️' },
};

export function libelleCodeMeteo(code) {
  return LIBELLES_CODE_METEO[code] ?? { libelle: 'Météo inconnue', emoji: '' };
}

// F8.1 : prévisions 7-16 jours aux coordonnées du rucher, via une API
// gratuite exposant les modèles AROME/ARPEGE. Open-Meteo (sans clé, usage
// non commercial) sélectionne automatiquement le meilleur modèle
// disponible au point demandé ("best_match") — sur le territoire français,
// cela inclut AROME (courte échéance, haute résolution) et ARPEGE (au-delà
// de son horizon), conformément à l'exigence du cahier des charges §5.
export async function recupererPrevision(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: VARIABLES_JOUR.join(','),
    forecast_days: '16',
    timezone: 'auto',
  });
  const reponse = await fetch(`${BASE_URL}?${params.toString()}`);
  if (!reponse.ok) {
    throw new Error(`Échec de la récupération météo (HTTP ${reponse.status})`);
  }
  const donnees = await reponse.json();
  return construirePrevisionJournaliere(donnees);
}

function construirePrevisionJournaliere(donnees) {
  const j = donnees.daily;
  if (!j?.time) return [];
  return j.time.map((date, i) => ({
    date,
    code: j.weathercode?.[i] ?? null,
    temperatureMax: j.temperature_2m_max?.[i] ?? null,
    temperatureMin: j.temperature_2m_min?.[i] ?? null,
    precipitationMm: j.precipitation_sum?.[i] ?? null,
    probabilitePluie: j.precipitation_probability_max?.[i] ?? null,
    ventMaxKmh: j.wind_speed_10m_max?.[i] ?? null,
  }));
}

// F8.3 : signaler les créneaux favorables à une visite. Heuristique simple
// et volontairement fixe (température, vent, absence de pluie) — ceci
// n'est PAS le moteur de règles paramétrable de l'addendum M12 (L3bis),
// explicitement hors périmètre ici ; juste un repère indicatif à l'œil nu.
const SEUIL_TEMPERATURE_MIN = 15;
const SEUIL_VENT_MAX_KMH = 20;
const SEUIL_PRECIPITATION_MAX_MM = 1;

export function estCreneauFavorable(jour) {
  if (jour.temperatureMax == null || jour.ventMaxKmh == null || jour.precipitationMm == null) {
    return false;
  }
  return (
    jour.temperatureMax >= SEUIL_TEMPERATURE_MIN &&
    jour.ventMaxKmh <= SEUIL_VENT_MAX_KMH &&
    jour.precipitationMm < SEUIL_PRECIPITATION_MAX_MM
  );
}
