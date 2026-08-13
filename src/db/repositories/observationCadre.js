import { db } from '../db.js';

export async function enregistrerObservationCadre(observation) {
  return db.observation_cadre.add(observation);
}

export async function listerObservationsVisite(visiteId) {
  return db.observation_cadre
    .where('visite_id')
    .equals(visiteId)
    .and((o) => !o.deleted_at)
    .toArray();
}

export async function supprimerObservationCadre(id) {
  const maintenant = new Date().toISOString();
  await db.observation_cadre.update(id, { deleted_at: maintenant, updated_at: maintenant });
  const observation = await db.observation_cadre.get(id);
  if (observation) await recalculerAgregatsVisite(observation.visite_id);
}

// §6.4 "Agrégation cadre → colonie", règle cardinale "jamais de double
// saisie" : dès qu'au moins une observation_cadre existe pour la visite,
// les compteurs colonie de cette visite sont recalculés et remplacés —
// source_agregats bascule sur calcule_depuis_cadres. Aucun écran ne permet
// de rééditer une visite déjà enregistrée : la visite reste donc de fait
// non modifiable après coup, sans verrou supplémentaire à construire.
export async function recalculerAgregatsVisite(visiteId) {
  const observations = await listerObservationsVisite(visiteId);
  const visite = await db.visite.get(visiteId);
  if (!visite) return;

  if (observations.length === 0) {
    // Toutes les observations de cette visite ont été retirées : repasse
    // en saisie directe plutôt que de laisser un calcul figé sans source.
    if (visite.source_agregats === 'calcule_depuis_cadres') {
      await db.visite.update(visiteId, {
        source_agregats: 'saisie_directe',
        updated_at: new Date().toISOString(),
      });
    }
    return;
  }

  let sommeCouvainOpercule = 0;
  let sommeProvisions = 0;
  let sommePondereePonte = 0;
  let sommeSurfaceCouvain = 0;

  for (const o of observations) {
    sommeCouvainOpercule += o.couvain_opercule ?? 0;
    sommeProvisions += (o.miel_opercule ?? 0) + (o.nectar_frais ?? 0) + (o.pollen ?? 0);

    // Pondération par la surface de couvain (opercule + ouvert) de la
    // face — une face sans couvain ni score n'entre pas dans la moyenne.
    const surfaceCouvain = (o.couvain_opercule ?? 0) + (o.couvain_ouvert ?? 0);
    if (o.score_ponte != null && surfaceCouvain > 0) {
      sommePondereePonte += o.score_ponte * surfaceCouvain;
      sommeSurfaceCouvain += surfaceCouvain;
    }
  }

  // nb_cadres_* reste un entier (schéma existant, cohérent avec le
  // compteur de saisie directe) : huitièmes cumulés / 8, arrondi.
  await db.visite.update(visiteId, {
    nb_cadres_couvain_opercule: Math.round(sommeCouvainOpercule / 8),
    nb_cadres_provisions: Math.round(sommeProvisions / 8),
    score_ponte:
      sommeSurfaceCouvain > 0
        ? Math.round(sommePondereePonte / sommeSurfaceCouvain)
        : visite.score_ponte,
    source_agregats: 'calcule_depuis_cadres',
    updated_at: new Date().toISOString(),
  });
}
