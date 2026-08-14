import { db } from '../db.js';
import { obtenirSaison } from '../../lib/saison.js';

// Charge tous les événements d'une colonie (ou de toute l'exploitation si
// colonieId est omis) — visite, sanitaire (traitement/varroa/nourrissement),
// récolte, mouvement — étiquetés `_type`/`_date` pour un traitement uniforme
// (retour d'usage réel du 14/08/2026 : la fiche visite et le sanitaire
// étaient consultables séparément, jamais ensemble).
async function chargerTousEvenements(colonieId) {
  const parColonie = (table) =>
    colonieId
      ? db[table].where('colonie_id').equals(colonieId).and((r) => !r.deleted_at).toArray()
      : db[table].filter((r) => !r.deleted_at).toArray();

  const [visites, traitements, comptages, nourrissements, recoltes, mouvements] =
    await Promise.all([
      parColonie('visite'),
      parColonie('traitement'),
      parColonie('comptage_varroa'),
      parColonie('nourrissement'),
      parColonie('recolte'),
      parColonie('mouvement'),
    ]);

  const observationsCadre =
    visites.length > 0
      ? await db.observation_cadre
          .where('visite_id')
          .anyOf(visites.map((v) => v.id))
          .and((o) => !o.deleted_at)
          .toArray()
      : [];
  const cadresParVisite = new Map();
  for (const o of observationsCadre) {
    if (!cadresParVisite.has(o.visite_id)) cadresParVisite.set(o.visite_id, []);
    cadresParVisite.get(o.visite_id).push(o);
  }

  // La visite précédente (pour les écarts affichés) se détermine sur la
  // chronologie des visites seules, indépendamment des autres événements
  // mêlés ensuite dans le même flux.
  const visitesTriees = [...visites].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  const precedenteParVisite = new Map();
  visitesTriees.forEach((v, i) => precedenteParVisite.set(v.id, visitesTriees[i - 1] ?? null));

  const colonieIds = [...new Set([...visites, ...traitements, ...comptages, ...nourrissements, ...recoltes, ...mouvements].map((r) => r.colonie_id))];
  const colonies = await db.colonie.bulkGet(colonieIds);
  const rucheIds = [...new Set(colonies.map((c) => c?.ruche_id).filter(Boolean))];
  const ruches = await db.ruche.bulkGet(rucheIds);
  const rucheParId = new Map(ruches.filter(Boolean).map((r) => [r.id, r]));
  const rucheParColonieId = new Map(
    colonies.filter(Boolean).map((c) => [c.id, rucheParId.get(c.ruche_id) ?? null])
  );
  const rucherIds = [...new Set(ruches.filter(Boolean).map((r) => r.rucher_id).filter(Boolean))];
  const ruchers = await db.rucher.bulkGet(rucherIds);
  const rucherParId = new Map(ruchers.filter(Boolean).map((r) => [r.id, r]));
  const rucherParColonieId = new Map(
    colonies.filter(Boolean).map((c) => {
      const ruche = rucheParId.get(c.ruche_id);
      return [c.id, ruche ? (rucherParId.get(ruche.rucher_id) ?? null) : null];
    })
  );

  const evenements = [
    ...visites.map((v) => ({
      _type: 'visite',
      _date: v.date,
      _ruche: rucheParColonieId.get(v.colonie_id),
      _rucher: rucherParColonieId.get(v.colonie_id),
      visite: v,
      precedente: precedenteParVisite.get(v.id) ?? null,
      cadres: cadresParVisite.get(v.id) ?? [],
    })),
    ...traitements.map((t) => ({
      _type: 'traitement',
      _date: t.date_debut ?? t.date_fin,
      _ruche: rucheParColonieId.get(t.colonie_id),
      _rucher: rucherParColonieId.get(t.colonie_id),
      traitement: t,
    })),
    ...comptages.map((c) => ({
      _type: 'comptage_varroa',
      _date: c.date,
      _ruche: rucheParColonieId.get(c.colonie_id),
      _rucher: rucherParColonieId.get(c.colonie_id),
      comptage: c,
    })),
    ...nourrissements.map((n) => ({
      _type: 'nourrissement',
      _date: n.date,
      _ruche: rucheParColonieId.get(n.colonie_id),
      _rucher: rucherParColonieId.get(n.colonie_id),
      nourrissement: n,
    })),
    ...recoltes.map((r) => ({
      _type: 'recolte',
      _date: r.date,
      _ruche: rucheParColonieId.get(r.colonie_id),
      _rucher: rucherParColonieId.get(r.colonie_id),
      recolte: r,
    })),
    ...mouvements.map((m) => ({
      _type: 'mouvement',
      _date: m.date,
      _ruche: rucheParColonieId.get(m.colonie_id),
      _rucher: rucherParColonieId.get(m.colonie_id),
      mouvement: m,
    })),
  ];

  evenements.sort((a, b) => (b._date ?? '').localeCompare(a._date ?? ''));
  return evenements;
}

// Historique consolidé d'une colonie, regroupé par saison apicole
// (avril-mars), la plus récente en premier. Les événements sans date
// connue sont relégués dans un groupe à part, en dernier.
export async function listerHistoriqueConsolideColonie(colonieId) {
  const evenements = await chargerTousEvenements(colonieId);

  const groupes = new Map();
  const sansDate = [];
  for (const e of evenements) {
    const saison = obtenirSaison(e._date);
    if (!saison) {
      sansDate.push(e);
      continue;
    }
    if (!groupes.has(saison.label)) {
      groupes.set(saison.label, { debut: saison.debut, label: saison.label, evenements: [] });
    }
    groupes.get(saison.label).evenements.push(e);
  }

  const saisons = [...groupes.values()].sort((a, b) => b.debut - a.debut);
  if (sansDate.length > 0) {
    saisons.push({ debut: -Infinity, label: 'Date inconnue', evenements: sansDate });
  }
  return saisons;
}

// F10.2-adjacent (retour d'usage réel du 14/08/2026, distinct de l'export
// CSV par table prévu en L6) : une ligne par événement, toute
// l'exploitation, pour l'export consolidé de l'écran A.
export async function listerEvenementsExportConsolide() {
  return chargerTousEvenements(undefined);
}
