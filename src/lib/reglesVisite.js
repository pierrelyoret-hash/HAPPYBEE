import { creerTache } from '../db/repositories/taches.js';
import { evaluerVisite } from './moteurRegles.js';

// Extrait de src/features/saisie-visite/SaisieVisite.jsx (écran B) pour être
// partagé avec la revue de tournée (écran L2.7) — les deux écrans enregistrent
// une `visite` et doivent déclencher les mêmes règles de génération
// automatique de tâches (cahier des charges §6.3, parcours catégorie 1 §5).

function ajouterJours(dateIso, jours) {
  const d = new Date(dateIso);
  d.setDate(d.getDate() + jours);
  return d.toISOString();
}

// Génération automatique de tâches par anomalie (§6.3, retour d'usage réel
// du 15/08/2026) — une tâche directe par anomalie sélectionnée, à la
// différence de la cascade orpheline/bourdonneuse ci-dessous qui suit une
// intervention précise (cadre de couvain introduit), pas l'anomalie seule.
// "Autre" et "orpheline" volontairement absentes : "Autre" est trop
// générique pour un libellé actionnable, "orpheline" seule (sans cadre de
// couvain introduit) ne déclenche encore aucune action définie.
const REGLES_ANOMALIE = [
  ['bourdonneuse', 0, 'Secouer les cadres à 50m de la ruche pour faire tomber les pondeuses', 'urgente', 'visite_bourdonneuse_secouer'],
  ['pillage', 3, "Vérifier l'état de la colonie après le pillage", 'urgente', 'visite_pillage'],
  ['fausse_teigne', 14, 'Contrôler l’évolution de la fausse teigne', 'moyenne', 'visite_fausse_teigne'],
  ['mortalite_anormale', 3, 'Contrôler la colonie après mortalité anormale', 'urgente', 'visite_mortalite_anormale'],
  ['diarrhee', 7, 'Contrôler l’évolution (suspicion nosémose)', 'moyenne', 'visite_diarrhee'],
  ['abeilles_tremblantes', 3, 'Contrôler l’évolution (abeilles tremblantes)', 'urgente', 'visite_abeilles_tremblantes'],
  ['ponte_males', 10, 'Recontrôler la ponte', 'moyenne', 'visite_ponte_males'],
];

// Étape 5 du parcours catégorie 1 (brief L1+ §5) : la tâche urgente n'est
// créée qu'une fois la visite effectivement enregistrée, pour pouvoir la
// rattacher via visite_declencheuse_id.
export async function creerTacheSuspicionSiNecessaire(visite, { rucherId, rucheNumero } = {}) {
  if (!visite.suspicion_reglementee) return;
  const maintenant = new Date().toISOString();
  await creerTache({
    id: crypto.randomUUID(),
    colonie_id: visite.colonie_id,
    rucher_id: rucherId ?? null,
    libelle: `Suspicion de danger sanitaire de catégorie 1 — Ruche ${rucheNumero ?? ''} : déclaration et prélèvement à organiser`,
    // Échéance = maintenant : l'état "urgent" (lib/etats.js) ne se
    // déclenche que sur une échéance échue, pas sur le champ `priorite`.
    // Une suspicion catégorie 1 n'a pas de délai — elle est due immédiatement.
    date_echeance: maintenant,
    priorite: 'urgente',
    origine: 'manuelle',
    statut: 'a_faire',
    visite_declencheuse_id: visite.id,
    created_at: maintenant,
    updated_at: maintenant,
    deleted_at: null,
  });
}

// Rappels fixes (cahier des charges §6.3), même logique que ci-dessus :
// créés une fois la visite enregistrée, pour les rattacher.
export async function creerRappelsInterventionSiNecessaire(
  visite,
  { rucherId, cadreCouvainIntroduit = false } = {}
) {
  const maintenant = new Date().toISOString();

  if (visite.cellules_royales_type === 'essaimage' && visite.cellules_royales_nb > 0) {
    await creerTache({
      id: crypto.randomUUID(),
      colonie_id: visite.colonie_id,
      rucher_id: rucherId ?? null,
      libelle: "Contrôler l'essaimage",
      date_echeance: ajouterJours(visite.date, 7),
      priorite: 'moyenne',
      origine: 'generee',
      regle_origine: 'visite_cellules_essaimage',
      statut: 'a_faire',
      visite_declencheuse_id: visite.id,
      created_at: maintenant,
      updated_at: maintenant,
      deleted_at: null,
    });
  }

  if (visite.hausses_posees) {
    await creerTache({
      id: crypto.randomUUID(),
      colonie_id: visite.colonie_id,
      rucher_id: rucherId ?? null,
      libelle: 'Contrôler le remplissage',
      date_echeance: ajouterJours(visite.date, 14),
      priorite: 'moyenne',
      origine: 'generee',
      regle_origine: 'visite_hausse_posee',
      statut: 'a_faire',
      visite_declencheuse_id: visite.id,
      created_at: maintenant,
      updated_at: maintenant,
      deleted_at: null,
    });
  }

  // "Introduction d'un cadre de couvain frais" ne fait pas partie du
  // schéma `visite` (§4.2) — signal ponctuel de l'écran de saisie
  // uniquement, jamais persisté, seulement utilisé ici pour déclencher la
  // cascade.
  if (
    cadreCouvainIntroduit &&
    (visite.anomalies.includes('orpheline') || visite.anomalies.includes('bourdonneuse'))
  ) {
    const cascade = [
      [9, "Vérifier l'operculation des cellules royales"],
      [16, 'Vérifier la naissance'],
      [28, 'Contrôler la ponte'],
    ];
    for (const [jours, libelle] of cascade) {
      await creerTache({
        id: crypto.randomUUID(),
        colonie_id: visite.colonie_id,
        rucher_id: rucherId ?? null,
        libelle,
        date_echeance: ajouterJours(visite.date, jours),
        priorite: 'moyenne',
        origine: 'generee',
        regle_origine: 'visite_cadre_couvain_introduit',
        statut: 'a_faire',
        visite_declencheuse_id: visite.id,
        created_at: maintenant,
        updated_at: maintenant,
        deleted_at: null,
      });
    }
  }

  for (const [anomalie, jours, libelle, priorite, regleOrigine] of REGLES_ANOMALIE) {
    if (!visite.anomalies.includes(anomalie)) continue;
    await creerTache({
      id: crypto.randomUUID(),
      colonie_id: visite.colonie_id,
      rucher_id: rucherId ?? null,
      libelle,
      date_echeance: ajouterJours(visite.date, jours),
      priorite,
      origine: 'generee',
      regle_origine: regleOrigine,
      statut: 'a_faire',
      visite_declencheuse_id: visite.id,
      created_at: maintenant,
      updated_at: maintenant,
      deleted_at: null,
    });
  }

  // L3bis, R-ORPH-01 (bourdonneuse → recommandation à validation, pas une
  // tâche directe — régime différent des règles ci-dessus, voir §2.1/§2.2
  // du brief L3bis). Même point d'appel que le reste de cette fonction :
  // les deux écrans de saisie bénéficient donc automatiquement des
  // évolutions futures du moteur, sans re-câblage à chaque nouvelle règle
  // déclenchée par visite.
  await evaluerVisite(visite, rucherId ?? null);
}
