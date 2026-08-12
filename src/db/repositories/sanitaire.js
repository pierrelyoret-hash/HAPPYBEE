import { db } from '../db.js';

export async function enregistrerTraitement(traitement) {
  return db.traitement.add(traitement);
}

export async function enregistrerComptageVarroa(comptage) {
  return db.comptage_varroa.add(comptage);
}

export async function enregistrerNourrissement(nourrissement) {
  return db.nourrissement.add(nourrissement);
}

// Seuils par défaut, brief L2.2 §3 F3.4 — uniquement sur les deux fenêtres
// saisonnières explicitement chiffrées dans le cahier des charges. En
// dehors, aucun seuil par défaut n'est spécifié : niveau_alerte reste vide
// plutôt que d'inventer une valeur non validée.
export function calculerNiveauAlerte(dateIso, varroasParJour) {
  if (varroasParJour == null || !dateIso) return null;
  const mois = new Date(dateIso).getMonth() + 1;
  let seuilModere;
  let seuilFort;
  if (mois === 4 || mois === 5) {
    seuilModere = 1;
    seuilFort = 5;
  } else if (mois === 6 || mois === 7) {
    seuilModere = 2;
    seuilFort = 8;
  } else {
    return null;
  }
  if (varroasParJour > seuilFort) return 'fort';
  if (varroasParJour >= seuilModere) return 'modere';
  return 'faible';
}

// Historique mêlé (brief §2.4) : traitements, comptages et nourrissements
// d'une même colonie, triés du plus récent au plus ancien. `_type` et
// `_date` sont ajoutés pour l'affichage — ne font pas partie du schéma.
export async function listerHistoriqueSanitaire(colonieId) {
  const [traitements, comptages, nourrissements] = await Promise.all([
    db.traitement.where('colonie_id').equals(colonieId).and((t) => !t.deleted_at).toArray(),
    db.comptage_varroa.where('colonie_id').equals(colonieId).and((c) => !c.deleted_at).toArray(),
    db.nourrissement.where('colonie_id').equals(colonieId).and((n) => !n.deleted_at).toArray(),
  ]);

  const lignes = [
    ...traitements.map((t) => ({ ...t, _type: 'traitement', _date: t.date_debut ?? t.date_fin })),
    ...comptages.map((c) => ({ ...c, _type: 'comptage_varroa', _date: c.date })),
    ...nourrissements.map((n) => ({ ...n, _type: 'nourrissement', _date: n.date })),
  ];

  return lignes.sort((a, b) => (b._date ?? '').localeCompare(a._date ?? ''));
}

// Données de l'export PDF sanitaire (brief §2 point 8) : toutes colonies
// confondues ("un ou plusieurs ruchers"), filtrées sur la période — pas de
// nourrissement, hors du périmètre des deux blocs réglementaires visés.
export async function listerDonneesExportPdf(periodeDebut, periodeFin) {
  const dansPeriode = (dateStr) => !!dateStr && dateStr >= periodeDebut && dateStr <= periodeFin;

  const [traitements, comptages] = await Promise.all([
    db.traitement
      .filter((t) => !t.deleted_at && dansPeriode(t.date_debut ?? t.date_fin))
      .toArray(),
    db.comptage_varroa.filter((c) => !c.deleted_at && dansPeriode(c.date)).toArray(),
  ]);

  const colonieIds = [...new Set([...traitements, ...comptages].map((l) => l.colonie_id))];
  const colonies = await db.colonie.bulkGet(colonieIds);
  const rucheIds = [...new Set(colonies.map((c) => c?.ruche_id).filter(Boolean))];
  const ruches = await db.ruche.bulkGet(rucheIds);
  const rucheParId = new Map(ruches.filter(Boolean).map((r) => [r.id, r]));

  const ruchesParColonie = new Map();
  colonies.forEach((colonie) => {
    if (!colonie) return;
    const ruche = rucheParId.get(colonie.ruche_id);
    if (ruche) ruchesParColonie.set(colonie.id, ruche);
  });

  traitements.sort((a, b) => (a.date_debut ?? '').localeCompare(b.date_debut ?? ''));
  comptages.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));

  return { traitements, comptages, ruchesParColonie };
}
