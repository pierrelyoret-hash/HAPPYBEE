import { db } from '../db.js';
import { obtenirSaison } from '../../lib/saison.js';
import { recalculerEcrituresProrataExercice } from '../../lib/repartitionEconomique.js';

// Poids moyen d'un cadre récolté — valeur par défaut donnée explicitement
// par le cahier des charges (§6.1), modifiable au cas par cas dans le
// formulaire. À caler sur les premières récoltes réelles (§10 points ouverts).
export const POIDS_MOYEN_CADRE_DEFAUT_KG = 2.5;

// §6.1 — calcul du poids net récolté. Ne s'applique pas au mode
// "pesee_globale_repartie", géré à part (répartition entre colonies avant
// tout calcul de poids net individuel).
export function calculerPoidsNet(recolte) {
  const { mode_saisie, poids_brut, tare_hausse, nb_hausses, nb_cadres, ratio_remplissage_pct } =
    recolte;
  switch (mode_saisie) {
    case 'poids_simple':
      return poids_brut ?? null;
    case 'poids_avec_tare':
      if (poids_brut == null) return null;
      return poids_brut - (tare_hausse ?? 0) * (nb_hausses ?? 0);
    case 'nombre_cadres':
      if (nb_cadres == null) return null;
      return nb_cadres * (recolte.poids_moyen_cadre ?? POIDS_MOYEN_CADRE_DEFAUT_KG);
    case 'ratio_remplissage':
      if (nb_hausses == null || ratio_remplissage_pct == null || recolte.capacite_hausse_kg == null) {
        return null;
      }
      return nb_hausses * recolte.capacite_hausse_kg * (ratio_remplissage_pct / 100);
    case 'pesee_hausse_par_hausse':
      return Array.isArray(recolte.pesees_hausses)
        ? recolte.pesees_hausses.reduce((somme, p) => somme + (Number(p) || 0), 0)
        : null;
    default:
      return null;
  }
}

// L4 (brief_L4_economique.md §6.2) : toute récolte enregistrée déclenche le
// recalcul des écritures en clé "prorata_production" de son exercice — dans
// le repository, pas dans l'écran, pour ne toucher aucun écran existant
// (§8 étape 9 du brief). Silencieux si L4 n'a encore aucune écriture dans
// cet exercice (recalculerEcrituresProrataExercice ne trouve rien à faire).
async function declencherRecalculEconomique(recolte) {
  const saison = obtenirSaison(recolte.date);
  if (saison) await recalculerEcrituresProrataExercice(saison.debut);
}

export async function enregistrerRecolte(recolte) {
  const id = await db.recolte.add(recolte);
  await declencherRecalculEconomique(recolte);
  return id;
}

// F4.2 — pesée globale répartie entre colonies. `repartitions` :
// [{ colonie_id, pct }], somme des pct = 100 (contrôlée côté écran). Chaque
// colonie reçoit sa propre ligne `recolte`, poids_net = sa part du poids
// brut total — pas de tare à ce stade, cf. §4.1 "poids total réparti entre
// colonies selon paramétrage".
export async function enregistrerRecoltePeseeGlobale({
  date,
  produit,
  poidsBrutTotal,
  typeMiellee,
  notes,
  repartitions,
}) {
  const maintenant = new Date().toISOString();
  const lignes = repartitions.map(({ colonie_id, pct }) => {
    const part = Math.round(poidsBrutTotal * (pct / 100) * 100) / 100;
    const pctAffiche = Math.round(pct * 10) / 10;
    return {
      id: crypto.randomUUID(),
      colonie_id,
      date: date || null,
      produit,
      mode_saisie: 'pesee_globale_repartie',
      poids_brut: null,
      tare_hausse: null,
      nb_hausses: null,
      nb_cadres: null,
      ratio_remplissage_pct: null,
      poids_net: part,
      type_miellee: typeMiellee || null,
      notes:
        notes ||
        `Part de ${part} kg répartie depuis une pesée globale de ${poidsBrutTotal} kg (${pctAffiche} %).`,
      created_at: maintenant,
      updated_at: maintenant,
      deleted_at: null,
    };
  });
  const resultat = await db.recolte.bulkAdd(lignes);
  if (lignes.length > 0) await declencherRecalculEconomique(lignes[0]);
  return resultat;
}

export async function listerHistoriqueRecolte(colonieId) {
  const recoltes = await db.recolte
    .where('colonie_id')
    .equals(colonieId)
    .and((r) => !r.deleted_at)
    .toArray();
  return recoltes.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
}

// Traitements actifs (délai d'attente en cours) pour une colonie, à la date
// donnée — F3.2, utilisé pour bloquer par une alerte l'enregistrement d'une
// récolte pendant ce délai.
export async function listerTraitementsEnDelaiAttente(colonieId, dateIso) {
  const date = dateIso || new Date().toISOString().slice(0, 10);
  const traitements = await db.traitement
    .where('colonie_id')
    .equals(colonieId)
    .and((t) => !t.deleted_at)
    .toArray();
  return traitements.filter((t) => t.date_fin_delai_attente && t.date_fin_delai_attente >= date);
}

// F4.4 — tableau de rendement par colonie, par ruche et par saison
// (= année de récolte), avec comparaison pluriannuelle. Un tableau distinct
// par produit (miel, cire… ne s'additionnent pas entre eux) ; seuls les
// produits réellement récoltés apparaissent.
export async function obtenirRendementParColonieEtAnnee() {
  const recoltes = await db.recolte.filter((r) => !r.deleted_at && r.poids_net != null).toArray();
  if (recoltes.length === 0) return { annees: [], parProduit: {} };

  const colonieIds = [...new Set(recoltes.map((r) => r.colonie_id))];
  const colonies = await db.colonie.bulkGet(colonieIds);
  const rucheIds = [...new Set(colonies.map((c) => c?.ruche_id).filter(Boolean))];
  const ruches = await db.ruche.bulkGet(rucheIds);
  const rucheParId = new Map(ruches.filter(Boolean).map((r) => [r.id, r]));
  const rucheParColonieId = new Map(
    colonies.filter(Boolean).map((c) => [c.id, rucheParId.get(c.ruche_id)])
  );

  const annees = [...new Set(recoltes.map((r) => (r.date ?? '').slice(0, 4)).filter(Boolean))].sort();

  const parProduit = {};
  for (const r of recoltes) {
    const annee = (r.date ?? '').slice(0, 4);
    if (!annee) continue;
    const produit = r.produit ?? 'non_precise';
    const ruche = rucheParColonieId.get(r.colonie_id);

    parProduit[produit] ??= new Map();
    const parColonie = parProduit[produit];
    if (!parColonie.has(r.colonie_id)) {
      parColonie.set(r.colonie_id, {
        colonieId: r.colonie_id,
        rucheNumero: ruche?.numero ?? '?',
        parAnnee: {},
        total: 0,
      });
    }
    const ligne = parColonie.get(r.colonie_id);
    ligne.parAnnee[annee] = (ligne.parAnnee[annee] ?? 0) + r.poids_net;
    ligne.total += r.poids_net;
  }

  const parProduitTrie = {};
  for (const [produit, parColonie] of Object.entries(parProduit)) {
    parProduitTrie[produit] = [...parColonie.values()].sort((a, b) => a.rucheNumero - b.rucheNumero);
  }

  return { annees, parProduit: parProduitTrie };
}
