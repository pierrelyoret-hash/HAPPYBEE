import { obtenirRucher } from '../db/repositories/ruchers.js';

// Champs `dashboard_data` retenus pour l'affichage (liste non exhaustive de
// l'API Netatmo — on ignore volontairement time_utc, date_max_temp, etc.)
export const CHAMPS_NETATMO = {
  Temperature: { libelle: 'Température', unite: '°C' },
  Humidity: { libelle: 'Humidité', unite: '%' },
  CO2: { libelle: 'CO₂', unite: 'ppm' },
  Pressure: { libelle: 'Pression', unite: 'hPa' },
  Noise: { libelle: 'Bruit', unite: 'dB' },
  Rain: { libelle: 'Pluie', unite: 'mm/h' },
  sum_rain_1: { libelle: 'Pluie (1h)', unite: 'mm' },
  sum_rain_24: { libelle: 'Pluie (24h)', unite: 'mm' },
  WindStrength: { libelle: 'Vent', unite: 'km/h' },
  GustStrength: { libelle: 'Rafales', unite: 'km/h' },
};

export async function recupererReleveNetatmo() {
  const reponse = await fetch('/api/netatmo-meteo');
  const corps = await reponse.json().catch(() => null);
  if (!reponse.ok || !corps || corps.erreur) {
    throw new Error(corps?.erreur ?? `Station indisponible (HTTP ${reponse.status})`);
  }
  return corps.releves;
}

// Modules physiquement à l'extérieur de la station (les ruches sont dehors,
// cf. netlify/functions/netatmo-meteo.mjs LIBELLES_TYPE) — le module
// principal (NAMain, intérieur) et un éventuel module additionnel intérieur
// (NAModule4) sont exclus.
const TYPES_MODULES_EXTERIEURS = new Set(['NAModule1', 'NAModule2', 'NAModule3']);

// Extension F2.4 (15/08/2026, arbitrage §18/§19 cahier des charges) :
// capture un instantané météo extérieure sur la visite, mais uniquement
// pour le rucher explicitement marqué comme celui où se trouve la station
// (rucher.station_meteo_ici) — la station n'est pas géolocalisée, rien ne
// permet de la rattacher automatiquement à un rucher. Ne lève jamais
// d'erreur : une visite s'enregistre même si la station est injoignable ou
// hors-ligne (même dégradation silencieuse que StationNetatmo côté écran
// Météo).
export async function capturerMeteoDomicileSiApplicable(rucherId) {
  if (!rucherId) return null;
  try {
    const rucher = await obtenirRucher(rucherId);
    if (!rucher?.station_meteo_ici) return null;

    const releves = await recupererReleveNetatmo();
    const modulesExterieurs = releves
      .filter((r) => TYPES_MODULES_EXTERIEURS.has(r.type))
      .map((r) => ({ type: r.type, libelle: r.libelle, donnees: r.donnees }));
    if (modulesExterieurs.length === 0) return null;

    return { capture_le: new Date().toISOString(), modules: modulesExterieurs };
  } catch (err) {
    console.error('[météo domicile] capture ignorée', err);
    return null;
  }
}
