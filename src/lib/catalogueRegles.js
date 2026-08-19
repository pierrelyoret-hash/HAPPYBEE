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
// Catalogue en cours de complétion (§9 étape 5, après validation du moteur
// sur R-CLIM-01 seule à l'étape 4). Deux familles de règles selon leur
// portée (regle.portee, lu par le moteur — voir src/lib/moteurRegles.js) :
// "rucher" (météo, une évaluation par rucher) ou "colonie" (état/absence,
// une évaluation par colonie active du rucher).
export const CATALOGUE_REGLES_PAR_DEFAUT = [
  {
    code: 'R-CLIM-01',
    version: 1,
    famille: 'climat',
    portee: 'rucher',
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
  {
    code: 'R-CLIM-02',
    version: 1,
    famille: 'climat',
    // "colonie" et non "rucher" : le signal météo est partagé par tout le
    // rucher, mais "en retard" se mesure par colonie (obtenirDerniereVisite
    // est déjà par colonie, comme l'état "à visiter" existant) — sans quoi
    // une seule colonie à jour masquerait le retard des autres du même
    // rucher, ou l'inverse.
    portee: 'colonie',
    declencheur: { type: 'agregat', agregat: 'fenetreVisiteRetard' },
    fenetre_saisonniere: null,
    enonce_modele:
      "Créneau favorable à une visite aujourd'hui, et ce rucher n'a pas été visité depuis {joursDepuisVisite} jours.",
    justification:
      "Une fenêtre météo favorable (température, vent, absence de pluie) rend la visite plus confortable et moins perturbante pour la colonie qu'un jour de mauvais temps — d'autant plus utile quand le rucher est en retard de visite.",
    sources: [
      'Addendum M12 (archivé), §4-§5 — moteur de recommandations',
      'src/lib/etats.js — même seuil de retard que la règle "à visiter" existante',
    ],
    garde_fous: [
      'Simple repère indicatif, pas une obligation — un jour non favorable reste un jour où visiter si nécessaire.',
    ],
    urgence: 1,
    actions_proposees: ['Programmer une visite ce rucher aujourd\'hui ou dans les prochains jours favorables'],
    active: true,
  },
  {
    code: 'R-VARR-03',
    version: 1,
    famille: 'varroa',
    portee: 'colonie',
    declencheur: { type: 'absence', cible: 'comptage_varroa', seuilJours: 45 },
    // Fenêtre confirmée par 1-SPEC/Pierre (19/08/2026) : avril à octobre.
    fenetre_saisonniere: { moisDebut: 4, moisFin: 10 },
    enonce_modele:
      'Aucun comptage varroa enregistré pour cette colonie depuis au moins {seuilJours} jours, en saison.',
    justification:
      "Un suivi régulier du varroa permet de détecter une infestation avant qu'elle ne devienne un niveau fort — un silence prolongé en pleine saison n'est pas une absence de risque, c'est une absence d'information.",
    sources: [
      'Addendum M12 (archivé), §4-§5 — moteur de recommandations',
      'brief_L2.2_sanitaire.md — seuils de niveau varroa existants',
    ],
    garde_fous: [
      'Recommande un comptage, ne présume ni ne diagnostique un niveau varroa.',
    ],
    urgence: 1,
    actions_proposees: ['Faire un comptage varroa sur cette colonie'],
    active: true,
  },
  {
    code: 'R-NOUR-01',
    version: 1,
    famille: 'nourrissement',
    portee: 'colonie', // signal météo du rucher (partagé) + état propre à la colonie
    // "+" du §2.2 lu comme un ET des trois conditions (pas un OU) : c'est
    // le cumul canicule+sécheresse+provisions faibles qui fait le risque
    // réel de disette, pas chacune isolément — interprétation non confirmée
    // explicitement par 1-SPEC, à revoir si signalé incorrect.
    declencheur: { type: 'agregat_et_etat', agregats: ['canicule', 'secheresse'], champ: 'nb_cadres_provisions' },
    // Seuil "provisions faibles" : par défaut, aucune valeur n'est fournie
    // par le brief ni par 1-SPEC — 2 cadres choisi par analogie avec les
    // seuils bas déjà utilisés ailleurs dans l'app (comptage varroa,
    // fausse teigne). Paramétrable (parametres_utilisateur), À CONFIRMER.
    parametres_defaut: { provisionsFaiblesMaxCadres: 2 },
    fenetre_saisonniere: null,
    enonce_modele:
      "Canicule et sécheresse en cours sur ce rucher, et cette colonie a des provisions faibles ({provisions} cadre(s)) — risque de disette.",
    justification:
      "La combinaison chaleur + sécheresse tarit les ressources butinables au moment même où la colonie consomme le plus — des provisions déjà basses dans ce contexte peuvent s'épuiser rapidement.",
    sources: [
      'Addendum M12 (archivé), §4-§5 — moteur de recommandations',
    ],
    garde_fous: [
      'Recommande une vérification et un nourrissement éventuel, ne prescrit ni quantité ni composition — ces choix restent à la saisie du nourrissement (écran dédié).',
    ],
    urgence: 2,
    actions_proposees: ['Vérifier les provisions et envisager un nourrissement'],
    active: true,
  },
  {
    code: 'R-NOUR-02',
    version: 1,
    famille: 'nourrissement',
    portee: 'colonie',
    declencheur: { type: 'etat', champ: 'nb_cadres_provisions' },
    parametres_defaut: { provisionsFaiblesMaxCadres: 2 },
    // Confirmé par 1-SPEC/Pierre (19/08/2026) : octobre — mois d'entrée de
    // l'hivernage.
    fenetre_saisonniere: { moisDebut: 10, moisFin: 10 },
    enonce_modele:
      "Provisions faibles ({provisions} cadre(s)) à l'entrée de l'hivernage pour cette colonie.",
    justification:
      "Une colonie qui entre dans l'hiver avec des provisions insuffisantes risque la disette hivernale, sans possibilité de nourrissement efficace une fois les températures durablement basses.",
    sources: ['Addendum M12 (archivé), §4-§5 — moteur de recommandations'],
    garde_fous: [
      'Recommande une vérification et un nourrissement éventuel, ne prescrit ni quantité ni composition.',
    ],
    urgence: 2,
    actions_proposees: ["Vérifier les provisions avant l'hiver et compléter si nécessaire"],
    active: true,
  },
  {
    code: 'R-ESSA-02',
    version: 1,
    famille: 'essaimage',
    portee: 'colonie',
    declencheur: { type: 'etat_double', champForce: 'nb_cadres_couvain_opercule', champHausse: 'nb_cadres_provisions' },
    // Seuils par cadres (confirmé par 1-SPEC/Pierre : "colonie forte" et
    // "hausse pleine" se lisent tous deux en cadres, pas sur l'échelle de
    // population 1-5) — valeurs par défaut non fournies, 7 cadres choisi
    // comme repère (sur une ruche Dadant 10 cadres, une majorité de cadres
    // occupés = colonie forte). Paramétrable, À CONFIRMER.
    parametres_defaut: { forceMinCadres: 7, hausseMinCadres: 7 },
    fenetre_saisonniere: null,
    enonce_modele:
      'Colonie forte ({couvain} cadres de couvain) avec une hausse bien remplie ({provisions} cadres) — envisager de poser une hausse supplémentaire.',
    justification:
      "Une colonie forte dont la hausse se remplit risque de manquer de place pour stocker le nectar de la miellée en cours, ce qui peut déclencher un essaimage par manque d'espace.",
    sources: ['Addendum M12 (archivé), §4-§5 — moteur de recommandations'],
    garde_fous: ['Recommande un geste de conduite (poser une hausse), jamais un diagnostic.'],
    urgence: 1,
    actions_proposees: ['Poser une hausse supplémentaire'],
    active: true,
  },
  {
    code: 'R-REGL-02',
    version: 1,
    famille: 'reglementaire',
    // "exploitation" : la déclaration annuelle de détention de ruches est
    // une obligation de l'exploitant dans son ensemble, pas d'un rucher en
    // particulier — une seule évaluation, jamais répétée par rucher.
    portee: 'exploitation',
    declencheur: { type: 'calendrier' },
    // Confirmé par 1-SPEC/Pierre (19/08/2026) : ouvre en janvier, ferme en
    // novembre.
    fenetre_saisonniere: { moisDebut: 1, moisFin: 11 },
    enonce_modele: 'La période de déclaration annuelle des ruches est ouverte.',
    justification:
      'La déclaration annuelle de détention et emplacement des ruches est une obligation réglementaire, distincte du registre sanitaire (F5.1) — un rappel en début de fenêtre évite un oubli.',
    sources: ['Addendum M12 (archivé), §4-§5 — moteur de recommandations'],
    garde_fous: [
      "Rappel administratif, pas un conseil sanitaire — l'application ne remplit ni ne transmet la déclaration elle-même.",
    ],
    urgence: 2,
    actions_proposees: ['Effectuer la déclaration annuelle de détention de ruches'],
    active: true,
  },
  {
    // Traitée en dernier dans le catalogue (§9 étape 5) : seule règle à
    // proposer plusieurs conduites concurrentes et à devoir s'articuler
    // avec une tâche déjà créée ailleurs par le régime §2.1 (§2.2 du brief).
    code: 'R-ORPH-01',
    version: 1,
    famille: 'orphelinage',
    portee: 'colonie',
    // Déclenchée par un événement de visite (anomalie cochée), pas par un
    // agrégat ni une absence — évaluée depuis src/lib/reglesVisite.js à
    // l'enregistrement de la visite, jamais par le balayage périodique
    // evaluerRucher (voir evaluerVisite, src/lib/moteurRegles.js).
    declencheur: { type: 'anomalie_visite', anomalie: 'bourdonneuse' },
    fenetre_saisonniere: null,
    enonce_modele:
      'Colonie bourdonneuse signalée — deux conduites structurelles possibles, à choisir selon la force de la colonie et la saison (une troisième, secouer les cadres, est déjà planifiée automatiquement).',
    justification:
      "Face à une colonie bourdonneuse, le choix entre secouer les cadres (déjà planifié), introduire un cadre de couvain frais ou introduire une nouvelle reine dépend de la force de la colonie et de l'avancement de la saison — des éléments que le moteur ne peut apprécier seul.",
    sources: [
      'Addendum M12 (archivé), §4-§5 — moteur de recommandations',
      'Cahier des charges §20 (16/08/2026) — tâche "secouer les cadres" existante',
    ],
    garde_fous: [
      'Le geste "secouer les cadres à 50 m" est déjà planifié automatiquement dès que l\'anomalie bourdonneuse est signalée (visite_bourdonneuse_secouer) — ne pas le revalider ici, il ne fait pas partie des actions proposées ci-dessous.',
      "Introduire un cadre de couvain frais déclenche le suivi existant (contrôle des cellules royales à J+9, de la naissance à J+16, de la ponte à J+28).",
      'Action de conduite, jamais un diagnostic ni un traitement.',
    ],
    urgence: 2,
    // Seulement les DEUX conduites structurelles — "secouer" est
    // délibérément absente (déjà créée directement, §2.2 du brief).
    actions_proposees: [
      'Introduire un cadre de couvain frais',
      'Introduire une nouvelle reine',
    ],
    active: true,
  },
];
