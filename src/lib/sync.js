import { db } from '../db/db.js';
import { supabase } from './supabase.js';

// Lot L2, première étape ("synchronisation" — cahier des charges §8).
// Photos et cadre par cadre ne sont pas encore synchronisés : ces tables
// existent au schéma mais aucune interface n'écrit dedans avant les étapes
// suivantes du lot. Les inclure ici ne coûte rien (elles restent vides) et
// évite d'y revenir spécifiquement à l'étape "photos".
const TABLES = ['rucher', 'ruche', 'colonie', 'reine', 'visite', 'tache', 'observation_cadre', 'photo'];

const CLE_CURSEURS = 'happybee_sync_curseurs';
const EPOQUE = '1970-01-01T00:00:00.000Z';
const INTERVALLE_MS = 20000;

function chargerCurseurs() {
  try {
    return JSON.parse(localStorage.getItem(CLE_CURSEURS)) ?? {};
  } catch {
    return {};
  }
}

function sauvegarderCurseurs(curseurs) {
  localStorage.setItem(CLE_CURSEURS, JSON.stringify(curseurs));
}

function maxUpdatedAt(lignes, actuel) {
  return lignes.reduce((max, l) => (l.updated_at > max ? l.updated_at : max), actuel);
}

// Écriture toujours locale d'abord, jamais bloquant (cahier des charges
// §3.2) : cette fonction ne fait qu'empiler vers le serveur ce qui a déjà
// été écrit localement. Une erreur réseau ici n'affecte jamais la saisie.
async function pousserTable(table, curseurs) {
  const depuis = curseurs[table]?.push ?? EPOQUE;
  const lignes = (await db[table].toArray()).filter((l) => l.updated_at > depuis);
  if (lignes.length === 0) return;

  const { error } = await supabase.from(table).upsert(lignes, { onConflict: 'id' });
  if (error) {
    console.error(`[sync] échec envoi ${table}`, error);
    return;
  }
  curseurs[table] = { ...curseurs[table], push: maxUpdatedAt(lignes, depuis) };
}

// Dernière écriture gagnante par enregistrement, sur updated_at (cahier des
// charges §3.2) : une ligne distante ne remplace la locale que si elle est
// au moins aussi récente — sinon la ligne locale sera poussée à son tour.
async function tirerTable(table, curseurs) {
  const depuis = curseurs[table]?.pull ?? EPOQUE;
  const { data, error } = await supabase.from(table).select('*').gt('updated_at', depuis);
  if (error) {
    console.error(`[sync] échec réception ${table}`, error);
    return;
  }
  if (!data || data.length === 0) return;

  for (const ligneDistante of data) {
    const ligneLocale = await db[table].get(ligneDistante.id);
    if (!ligneLocale || ligneLocale.updated_at <= ligneDistante.updated_at) {
      await db[table].put(ligneDistante);
    }
  }
  curseurs[table] = { ...curseurs[table], pull: maxUpdatedAt(data, depuis) };
}

let synchronisationEnCours = false;

// Événement écouté par les écrans en lecture (VueEnsemble, Historique) pour
// se recharger tout seuls quand une synchronisation en arrière-plan a pu
// changer leurs données. Sans ça, il fallait recharger la page à la main
// pour voir apparaître une visite arrivée d'un autre appareil — constaté
// le 12/08/2026 en testant téléphone + ordinateur en parallèle.
const EVENEMENT_SYNC = 'happybee-sync';

export async function synchroniser() {
  if (synchronisationEnCours) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session || !navigator.onLine) return;

  synchronisationEnCours = true;
  try {
    const curseurs = chargerCurseurs();
    for (const table of TABLES) {
      await pousserTable(table, curseurs);
      await tirerTable(table, curseurs);
    }
    sauvegarderCurseurs(curseurs);
    window.dispatchEvent(new Event(EVENEMENT_SYNC));
  } finally {
    synchronisationEnCours = false;
  }
}

export function surSync(gestionnaire) {
  window.addEventListener(EVENEMENT_SYNC, gestionnaire);
  return () => window.removeEventListener(EVENEMENT_SYNC, gestionnaire);
}

let demarre = false;

// Envoyée dès que le réseau revient (§3.2) : déclenchée à l'événement
// 'online', au démarrage, et rappelée à intervalle régulier en filet de
// sécurité (une modification en attente n'est jamais bloquée indéfiniment
// par un événement 'online' manqué).
export function demarrerSyncAutomatique() {
  if (demarre) return;
  demarre = true;
  synchroniser();
  window.addEventListener('online', synchroniser);
  setInterval(synchroniser, INTERVALLE_MS);
}
