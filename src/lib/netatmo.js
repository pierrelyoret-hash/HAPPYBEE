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
