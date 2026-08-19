// L3bis (brief_L3bis_moteur_regles.md §5, §9 étape 4) : catalogue des
// règles du moteur — définitions par défaut, insérées une fois (voir
// src/db/repositories/regles.js, initialiserCatalogue) puis laissées à
// l'exploitant (active, parametres_utilisateur sont modifiables en base et
// jamais réécrits par un redémarrage de l'application).
//
// urgence : 1 (faible) à 3 (urgente) — convention propre à ce module,
// distincte de tache.priorite (chaîne) ; la conversion se fait à la
// validation d'une recommandation (voir src/db/repositories/recommandations.js).
//
// Une seule règle pour l'instant (§9 étape 4 : "une seule règle pilote,
// la plus simple : un agrégat, aucune condition d'état") — le catalogue
// complet (9 règles, §2.2 du brief) vient à l'étape 5, après validation du
// moteur sur celle-ci.
export const CATALOGUE_REGLES_PAR_DEFAUT = [
  {
    code: 'R-CLIM-01',
    version: 1,
    famille: 'climat',
    declencheur: { type: 'agregat', agregat: 'canicule' },
    fenetre_saisonniere: null, // aucune restriction : une canicule reste un risque à toute période chaude
    enonce_modele:
      "Épisode de canicule en cours sur ce rucher (température maximale ≥ {tMaxMin} °C depuis {dureeJours} jours).",
    justification:
      "Une canicule prolongée augmente le risque de surchauffe de la ruche et accélère l'épuisement des réserves d'eau et de nourriture — ombrage, ventilation et point d'eau à proximité limitent le stress thermique de la colonie.",
    sources: [
      "Addendum M12 (archivé), §4-§5 — moteur de recommandations",
      'Retour terrain, conduite apicole par forte chaleur',
    ],
    garde_fous: [
      'Action de conduite, pas un diagnostic ni un traitement — aucun produit, aucune dose.',
      "Vérifier l'accès à l'eau à proximité immédiate du rucher plutôt que d'en créer un nouveau point si un existe déjà à distance raisonnable.",
    ],
    urgence: 2,
    actions_proposees: [
      "Installer ou vérifier l'ombrage du rucher",
      "Améliorer la ventilation (entrée élargie, aération)",
      "Vérifier ou ajouter un point d'eau à proximité",
    ],
    active: true,
  },
];
