import { db } from '../db/db.js';
import { supabase } from './supabase.js';

// Lot L2. `photo` et `audio` ne transportent que des métadonnées via la
// synchronisation générique de table (comme les autres) — l'octet lui-même
// (Blob, non sérialisable en JSON) transite à part, voir pousserBlobs
// ci-dessous.
const TABLES = [
  'rucher',
  'ruche',
  'colonie',
  'reine',
  'visite',
  'tache',
  'observation_cadre',
  'photo',
  'traitement',
  'comptage_varroa',
  'nourrissement',
  'document',
  'audio',
];

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

// Description de chaque table à blob : table Dexie des métadonnées, table
// Dexie du blob local (clé = `${champId}`), bucket Storage, extension et
// type MIME du fichier envoyé. photo et audio partagent exactement la même
// mécanique de transfert (lib/sync.js §L2.9/§L2.3-L2.8) — seule cette
// description change.
const TABLES_BLOB = [
  { table: 'photo', blobTable: 'photo_blob', champId: 'photo_id', bucket: 'photos', extension: 'jpg', type: 'image/jpeg' },
  { table: 'audio', blobTable: 'audio_blob', champId: 'audio_id', bucket: 'audio', extension: 'webm', type: 'audio/webm' },
];

// Envoie vers Supabase Storage les lignes dont le blob local n'est pas
// encore synchronisé. `.filter()` plutôt que `.where()` : statut_sync n'est
// pas indexé (peu de lignes concernées, un scan complet suffit).
async function pousserBlobs({ table, blobTable, champId, bucket, extension, type }) {
  const enAttente = await db[table]
    .filter((l) => !l.deleted_at && l.statut_sync !== 'synchronise')
    .toArray();

  for (const ligne of enAttente) {
    const ligneBlob = await db[blobTable].get(ligne.id);
    if (!ligneBlob) continue; // pas de blob local (créé sur un autre appareil) : rien à envoyer d'ici

    const chemin = `${ligne.id}.${extension}`;
    const { error } = await supabase.storage
      .from(bucket)
      .upload(chemin, ligneBlob.blob, { upsert: true, contentType: type });
    if (error) {
      console.error(`[sync] échec envoi ${table}`, ligne.id, error);
      continue;
    }

    const maintenant = new Date().toISOString();
    await db[table].update(ligne.id, {
      fichier_distant: chemin,
      statut_sync: 'synchronise',
      updated_at: maintenant,
    });
    // La ligne mise à jour part au cycle de synchronisation suivant via
    // pousserTable(table, ...), comme toute autre modification locale.
  }
}

// Résout une URL affichable : le blob local s'il existe (aucun réseau
// nécessaire), sinon une URL signée à la demande depuis Supabase Storage
// (bucket privé) — jamais mise en cache localement ici, c'est à l'appelant
// de décider s'il veut conserver le blob téléchargé.
async function obtenirUrlAffichageBlob(ligne, { blobTable, bucket }) {
  const ligneBlob = await db[blobTable].get(ligne.id);
  if (ligneBlob) return URL.createObjectURL(ligneBlob.blob);
  if (!ligne.fichier_distant || !navigator.onLine) return null;

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(ligne.fichier_distant, 3600);
  if (error) {
    console.error('[sync] échec URL signée', bucket, ligne.id, error);
    return null;
  }
  return data.signedUrl;
}

export async function obtenirUrlAffichagePhoto(photo) {
  return obtenirUrlAffichageBlob(photo, TABLES_BLOB[0]);
}

export async function obtenirUrlAffichageAudio(audio) {
  return obtenirUrlAffichageBlob(audio, TABLES_BLOB[1]);
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
    for (const description of TABLES_BLOB) {
      await pousserBlobs(description);
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
