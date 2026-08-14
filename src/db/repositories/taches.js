import { db } from '../db.js';

const STATUTS_FERMES = ['faite', 'annulee'];

// Convention : une tâche liée à une colonie porte aussi le rucher_id de
// cette colonie, ce qui permet de tout récupérer en une requête indexée.
export async function listerTachesOuvertesRucher(rucherId) {
  const taches = await db.tache.where('rucher_id').equals(rucherId).toArray();
  return taches.filter((t) => !t.deleted_at && !STATUTS_FERMES.includes(t.statut));
}

export async function creerTache(tache) {
  return db.tache.add(tache);
}

export async function marquerTacheFaite(tacheId) {
  return db.tache.update(tacheId, {
    statut: 'faite',
    updated_at: new Date().toISOString(),
  });
}

const RANG_PRIORITE = { urgente: 0, moyenne: 1, faible: 2 };

// F7.3 — vue "à faire" consolidée : toutes les tâches ouvertes du rucher,
// enrichies du numéro de ruche pour l'affichage, triées par échéance puis
// priorité (une échéance absente passe en dernier — rien à faire de précis
// tant qu'elle n'est pas fixée).
export async function listerTachesAvecContexte(rucherId) {
  const taches = await listerTachesOuvertesRucher(rucherId);
  const colonieIds = [...new Set(taches.map((t) => t.colonie_id).filter(Boolean))];
  const colonies = await db.colonie.bulkGet(colonieIds);
  const rucheIds = [...new Set(colonies.map((c) => c?.ruche_id).filter(Boolean))];
  const ruches = await db.ruche.bulkGet(rucheIds);
  const rucheParId = new Map(ruches.filter(Boolean).map((r) => [r.id, r]));
  const rucheParColonieId = new Map(
    colonies.filter(Boolean).map((c) => [c.id, rucheParId.get(c.ruche_id)])
  );

  return taches
    .map((t) => ({ ...t, rucheNumero: rucheParColonieId.get(t.colonie_id)?.numero ?? null }))
    .sort((a, b) => {
      if (!a.date_echeance && !b.date_echeance) return RANG_PRIORITE[a.priorite] - RANG_PRIORITE[b.priorite];
      if (!a.date_echeance) return 1;
      if (!b.date_echeance) return -1;
      const diff = a.date_echeance.localeCompare(b.date_echeance);
      return diff !== 0 ? diff : RANG_PRIORITE[a.priorite] - RANG_PRIORITE[b.priorite];
    });
}
