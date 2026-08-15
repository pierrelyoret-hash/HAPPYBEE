import { db } from '../db.js';
import { recupererPrevision } from '../../lib/meteo.js';

// F8.1 + F8.2 : récupère la prévision aux coordonnées du rucher, la met en
// cache localement (une ligne par rucher, écrasée à chaque succès), et
// retombe sur la dernière prévision connue si le réseau est indisponible
// (hors-ligne, cahier des charges §5 "seuls la météo... exigent le
// réseau" — la consultation, elle, doit rester possible hors-ligne).
export async function obtenirPrevisionRucher(rucher) {
  if (rucher?.latitude == null || rucher?.longitude == null) {
    return { statut: 'sans_coordonnees' };
  }

  try {
    const jours = await recupererPrevision(rucher.latitude, rucher.longitude);
    const recupereeLe = new Date().toISOString();
    await db.meteo_cache.put({ rucher_id: rucher.id, jours, recuperee_le: recupereeLe });
    return { statut: 'ok', jours, horsLigne: false, recupereeLe };
  } catch (err) {
    console.error('[meteo] échec récupération, tentative de repli sur le cache', err);
    const cache = await db.meteo_cache.get(rucher.id);
    if (cache) {
      return { statut: 'ok', jours: cache.jours, horsLigne: true, recupereeLe: cache.recuperee_le };
    }
    return { statut: 'erreur' };
  }
}
