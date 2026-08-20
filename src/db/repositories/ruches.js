import { db } from '../db.js';

// L4 (brief_L4_economique.md §7) : sélection libre de ruches, tous ruchers
// confondus — le seul appel existant jusqu'ici (listerRuchesRucher) est
// borné à un rucher.
export async function listerToutesLesRuches() {
  const ruches = await db.ruche.filter((r) => !r.deleted_at).toArray();
  return ruches.sort((a, b) => a.numero - b.numero);
}

export async function listerRuchesRucher(rucherId) {
  const ruches = await db.ruche
    .where('rucher_id')
    .equals(rucherId)
    .and((r) => !r.deleted_at)
    .toArray();
  return ruches.sort((a, b) => a.numero - b.numero);
}

// Nombre de ruches actives par rucher, pour l'affichage de la liste des
// ruchers sur l'écran d'accueil — une requête groupée plutôt qu'une par
// rucher.
export async function compterRuchesActivesParRucher(rucherIds) {
  if (rucherIds.length === 0) return new Map();
  const ruches = await db.ruche
    .where('rucher_id')
    .anyOf(rucherIds)
    .and((r) => !r.deleted_at && r.statut === 'active')
    .toArray();
  const compte = new Map();
  for (const r of ruches) {
    compte.set(r.rucher_id, (compte.get(r.rucher_id) ?? 0) + 1);
  }
  return compte;
}

// F1.1 (création) — une ruche n'existe jamais sans colonie (§4.2 "règle
// structurante" : ruche = contenant, colonie = vivant, toujours distincts
// mais une ruche neuve reçoit forcément une colonie initiale). Rejoint
// aussitôt l'ordre de tournée du rucher, sinon elle resterait invisible
// dans l'écran de tournée qui parcourt `ordre_tournee`, pas la table
// `ruche` directement.
export async function creerRucheAvecColonie({
  rucherId,
  numero,
  type,
  dateAcquisition,
  origineRuche,
  origineColonie,
}) {
  const maintenant = new Date().toISOString();
  const rucheId = crypto.randomUUID();
  const colonieId = crypto.randomUUID();

  await db.transaction('rw', db.ruche, db.colonie, db.rucher, async () => {
    await db.ruche.add({
      id: rucheId,
      rucher_id: rucherId,
      numero,
      type: type || null,
      date_acquisition: dateAcquisition || null,
      origine: origineRuche || null,
      qr_code: null,
      statut: 'active',
      immobilisation_id: null,
      created_at: maintenant,
      updated_at: maintenant,
      deleted_at: null,
    });
    await db.colonie.add({
      id: colonieId,
      ruche_id: rucheId,
      date_debut: maintenant,
      date_fin: null,
      motif_fin: null,
      origine: origineColonie || null,
      colonie_mere_id: null,
      race_presumee: null,
      statut: 'active',
      created_at: maintenant,
      updated_at: maintenant,
      deleted_at: null,
    });
    const rucher = await db.rucher.get(rucherId);
    const ordreTournee = [...(rucher?.ordre_tournee ?? []), rucheId];
    await db.rucher.update(rucherId, { ordre_tournee: ordreTournee, updated_at: maintenant });
  });

  return { rucheId, colonieId };
}

// Transhumance (14/08/2026) — déplace une ruche d'un rucher à un autre :
// change son rattachement, la retire de l'ordre de tournée d'origine, la
// rejoint à celui de destination. La colonie qu'elle héberge suit
// automatiquement (colonie.ruche_id ne change pas, seul ruche.rucher_id
// change — la colonie est déjà rattachée à la ruche, pas au rucher).
export async function deplacerRucheVersRucher(rucheId, rucherOrigineId, rucherDestinationId) {
  const maintenant = new Date().toISOString();
  await db.transaction('rw', db.ruche, db.rucher, async () => {
    await db.ruche.update(rucheId, { rucher_id: rucherDestinationId, updated_at: maintenant });

    const origine = await db.rucher.get(rucherOrigineId);
    if (origine) {
      await db.rucher.update(rucherOrigineId, {
        ordre_tournee: (origine.ordre_tournee ?? []).filter((id) => id !== rucheId),
        updated_at: maintenant,
      });
    }

    const destination = await db.rucher.get(rucherDestinationId);
    if (destination) {
      const ordreTournee = [...(destination.ordre_tournee ?? []), rucheId];
      await db.rucher.update(rucherDestinationId, { ordre_tournee: ordreTournee, updated_at: maintenant });
    }
  });
}

// F1.1 "archiver" — la ruche (le contenant) persiste en base, comme le
// reste de l'application le fait déjà (jamais de suppression définitive) ;
// elle sort seulement de l'ordre de tournée, qui pilote ce qui s'affiche
// dans l'écran de tournée.
// `date_reforme` (ajouté sans bump de version, comme score_ponte en v3 :
// champ non indexé, pas besoin de figurer dans stores()) sert au calcul
// L4 "ruches actives sur la période" (brief_L4_economique.md §6.1) — sans
// cette date, impossible de savoir si une ruche réformée l'était déjà avant
// l'exercice ou en cours d'exercice (auquel cas elle compte). Les ruches
// réformées avant ce champ n'en ont pas : voir le commentaire de
// estActiveSurExercice (src/lib/repartitionEconomique.js) sur ce cas.
export async function archiverRuche(rucheId, rucherId) {
  const maintenant = new Date().toISOString();
  await db.transaction('rw', db.ruche, db.rucher, async () => {
    await db.ruche.update(rucheId, { statut: 'reformee', date_reforme: maintenant, updated_at: maintenant });
    const rucher = await db.rucher.get(rucherId);
    if (rucher) {
      await db.rucher.update(rucherId, {
        ordre_tournee: (rucher.ordre_tournee ?? []).filter((id) => id !== rucheId),
        updated_at: maintenant,
      });
    }
  });
}
