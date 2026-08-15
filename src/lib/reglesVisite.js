import { creerTache } from '../db/repositories/taches.js';

// Extrait de src/features/saisie-visite/SaisieVisite.jsx (écran B) pour être
// partagé avec la revue de tournée (écran L2.7) — les deux écrans enregistrent
// une `visite` et doivent déclencher les mêmes règles de génération
// automatique de tâches (cahier des charges §6.3, parcours catégorie 1 §5).

function ajouterJours(dateIso, jours) {
  const d = new Date(dateIso);
  d.setDate(d.getDate() + jours);
  return d.toISOString();
}

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
}
