import Dexie from 'dexie';
import { db } from '../db.js';
import { reconstituerHistorique, recupererHistoriqueArchive } from '../../lib/meteoHistorique.js';

// bulkPut plutôt que bulkAdd : la clé composite [rucher_id+date] rend
// l'opération naturellement idempotente (rejouer une reconstitution
// n'écrit jamais de doublon, écrase la ligne existante).
async function enregistrerJours(rucherId, jours) {
  if (jours.length === 0) return 0;
  await db.meteo_journaliere.bulkPut(jours.map((j) => ({ ...j, rucher_id: rucherId })));
  return jours.length;
}

// L3b.1 : reconstitue au moins douze mois d'historique pour un rucher.
// Idempotent (voir enregistrerJours) — peut être rejoué sans risque si
// interrompu ou si l'exploitant le redemande.
export async function reconstituerHistoriqueRucher(rucher) {
  if (rucher?.latitude == null || rucher?.longitude == null) {
    return { statut: 'sans_coordonnees' };
  }
  try {
    const jours = await reconstituerHistorique(rucher.latitude, rucher.longitude);
    const nb = await enregistrerJours(rucher.id, jours);
    return { statut: 'ok', nbJours: nb };
  } catch (err) {
    console.error('[météo historique] échec reconstitution', rucher.id, err);
    return { statut: 'erreur', erreur: err.message };
  }
}

// §9 étape 2 : rafraîchissement quotidien — ne redemande que les jours
// manquants depuis le dernier jour connu (repli sur reconstituerHistoriqueRucher
// si aucun historique n'existe encore, ex. rucher jamais initialisé).
export async function rafraichirHistoriqueRucher(rucher) {
  if (rucher?.latitude == null || rucher?.longitude == null) {
    return { statut: 'sans_coordonnees' };
  }
  const dernierJour = await obtenirDernierJourConnu(rucher.id);
  if (!dernierJour) {
    return reconstituerHistoriqueRucher(rucher);
  }
  const dateDebut = ajouterJours(dernierJour, 1);
  const dateFin = new Date().toISOString().slice(0, 10);
  if (dateDebut > dateFin) return { statut: 'ok', nbJours: 0 }; // déjà à jour
  try {
    const jours = await recupererHistoriqueArchive(rucher.latitude, rucher.longitude, dateDebut, dateFin);
    const nb = await enregistrerJours(rucher.id, jours);
    return { statut: 'ok', nbJours: nb };
  } catch (err) {
    // Repli hors-ligne (§9 étape 2) : l'historique déjà stocké reste
    // consultable et les agrégats se recalculent dessus (F12.7) — un
    // rafraîchissement manqué n'empêche jamais le moteur de fonctionner,
    // il retarde seulement la prise en compte des tout derniers jours.
    console.error('[météo historique] échec rafraîchissement, historique existant conservé', rucher.id, err);
    return { statut: 'erreur', erreur: err.message };
  }
}

function ajouterJours(dateIso, jours) {
  const d = new Date(dateIso);
  d.setDate(d.getDate() + jours);
  return d.toISOString().slice(0, 10);
}

async function obtenirDernierJourConnu(rucherId) {
  const derniere = await db.meteo_journaliere
    .where('[rucher_id+date]')
    .between([rucherId, Dexie.minKey], [rucherId, Dexie.maxKey])
    .last();
  return derniere?.date ?? null;
}

// Agrégats et écrans : historique observé d'un rucher sur une période
// donnée (bornes incluses), trié par date croissante (ordre naturel de la
// clé composite).
export async function obtenirHistoriqueRucher(rucherId, dateDebut, dateFin) {
  return db.meteo_journaliere
    .where('[rucher_id+date]')
    .between([rucherId, dateDebut], [rucherId, dateFin], true, true)
    .toArray();
}

export async function compterJoursRucher(rucherId) {
  return db.meteo_journaliere
    .where('[rucher_id+date]')
    .between([rucherId, Dexie.minKey], [rucherId, Dexie.maxKey])
    .count();
}
