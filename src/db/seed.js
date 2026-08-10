import { db } from './db.js';

function uuid() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

export async function seedDemoData() {
  const existing = await db.rucher.count();
  if (existing > 0) {
    console.log('[seed] données déjà présentes, rien à faire.');
    return;
  }

  const timestamp = now();
  const rucherId = uuid();
  const rucheIds = [uuid(), uuid(), uuid()];
  const colonieIds = [uuid(), uuid(), uuid()];
  const reineIds = [uuid(), uuid()]; // ruche 3 : pas de reine confirmée

  await db.rucher.add({
    id: rucherId,
    nom: 'Dompierre-les-Ormes',
    commune: 'Dompierre-les-Ormes',
    latitude: 46.3167,
    longitude: 4.5167,
    altitude: 450,
    ordre_tournee: rucheIds,
    notes: '',
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  });

  const ruches = rucheIds.map((id, i) => ({
    id,
    rucher_id: rucherId,
    numero: i + 1,
    type: 'Dadant 10c',
    date_acquisition: timestamp,
    origine: 'achat',
    statut: 'active',
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  }));
  await db.ruche.bulkAdd(ruches);

  const colonies = colonieIds.map((id, i) => ({
    id,
    ruche_id: rucheIds[i],
    date_debut: timestamp,
    date_fin: null,
    motif_fin: null,
    origine: 'essaim primaire',
    colonie_mere_id: null,
    race_presumee: null,
    statut: 'active',
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  }));
  await db.colonie.bulkAdd(colonies);

  // Reines : ruches 1 et 2 seulement. La colonie de la ruche 3 reste
  // "active" sans aucun enregistrement reine associé — décision validée
  // avec l'utilisateur (pas de statut colonie dédié à ce cas).
  const reines = reineIds.map((id, i) => ({
    id,
    colonie_id: colonieIds[i],
    annee_naissance: new Date().getFullYear(),
    origine: 'élevée sur place',
    marquage_couleur: null,
    marquee: false,
    date_introduction: timestamp,
    date_fin: null,
    motif_fin: null,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  }));
  await db.reine.bulkAdd(reines);

  console.log(
    '[seed] jeu de données inséré : 1 rucher, 3 ruches, 3 colonies, 2 reines.'
  );
}
