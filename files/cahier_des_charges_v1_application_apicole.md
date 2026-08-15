# Cahier des charges fonctionnel — V1
## Application de gestion du rucher et de l'activité apicole

**Version** 1.1 — mise à jour du 11 août 2026 (voir §11 et §12)
**Destinataire** développement assisté (Claude Code)
**Exploitant** Pierre Lyoret — NAPI A5220476 — Dompierre-les-Ormes (71520), ~450 m d'altitude
**Statut** L1 livré (7 étapes) le 10 août 2026 — en usage réel avant l'ouverture de L2

---

## 0. Objectif et principes directeurs

Construire un outil unique couvrant la conduite du rucher, la conformité réglementaire et le pilotage économique, là où le marché impose de combiner trois outils distincts et ne couvre pas l'analytique par ruche.

Cinq principes non négociables :

1. **Utilisable au rucher, gants aux mains, sans réseau.** Toute fonctionnalité qui suppose une connexion est reportée hors du parcours de saisie.
2. **Saisie d'une visite en moins d'une minute par ruche.** Choix prédéfinis, texte libre en option, dictée vocale disponible.
3. **Les données appartiennent à l'exploitant.** Export intégral à tout moment, formats ouverts, aucune dépendance à un éditeur.
4. **Prêt pour un cadre fiscal, non activé.** Les champs nécessaires à une future EI sont captés dès aujourd'hui ; aucun export fiscal n'est affiché.
5. **Conduite biologique respectueuse du vivant.** La traçabilité des intrants et la limitation des interventions sont des exigences fonctionnelles, pas des options.

---

## 1. Périmètre

### Dans la V1

| Module | Contenu |
|---|---|
| M1 | Référentiel : exploitation, ruchers, ruches, colonies, reines |
| M2 | Carnet de visite avec photos en pièce jointe |
| M3 | Sanitaire : traitements, comptages varroa, nourrissement |
| M4 | Récoltes et rendement par ruche |
| M5 | Registre d'élevage — export PDF paginé conforme |
| M6 | Économique : écritures, affectation analytique, amortissements, indicateurs |
| M7 | Tâches et rappels générés automatiquement |
| M8 | Météo du rucher |
| M9 | Assistant IA contextuel |
| M10 | Export, sauvegarde, restauration |
| M11 | Import de l'existant (`archives_apicoles.csv`) |
| M12 | Moteur de recommandations — cf. addendum dédié |
| M13 | Observation cadre par cadre — cf. addendum observation cadre |

> **Écart avec le séquencement d'origine.** M10 et M11 étaient prévus en L6 (§8) mais ont été livrés dès L1 : protéger les données réelles de l'exploitant ne pouvait pas attendre cinq lots, et l'historique CSV existant devait être repris avant toute saisie de production. Le reste de M10/M11 (export CSV par table, rappel mensuel) reste ouvert pour L6.

### Hors V1, à conserver dans le modèle de données

- Module verger mellifère (plantations, floraisons, corrélation aux miellées) → **V2**
- Exports fiscaux : livre de recettes micro-BA, distinction production propre / négoce → **activés à la création de la structure**
- Analyse d'image par IA du couvain → **V2** *(les photos indexées par cadre sont désormais intégrées à M13, lot L2)*
- Élevage de reines, greffages, généalogie, sélection statistique → **hors trajectoire** (sans objet en dessous d'une vingtaine de colonies)
- Capteurs connectés → **hors trajectoire**

---

## 2. Contraintes

| Contrainte | Exigence |
|---|---|
| Connectivité | Saisie complète hors-ligne obligatoire ; synchronisation différée |
| Appareils | Téléphone (saisie terrain) + ordinateur (économique, exports) — **synchronisés** |
| Utilisateurs | Un seul, pas de gestion de rôles |
| Langue | Français exclusivement |
| Budget d'exploitation | ≤ 0 € par mois hors coût d'usage de l'API IA |
| Maintenance | L'exploitant est seul mainteneur, non développeur professionnel |
| Volumétrie | 3 à 30 colonies, 1 à 3 ruchers en usage courant, horizon 10 ans. Cible à terme relevée à 200 ruches / 5 ruchers (arbitrage du 11/08/2026, §11) — à prendre en compte dans la conception à partir de L2, sans remise en cause de L1 |
| Données personnelles | Aucune donnée de tiers hors nom des fournisseurs |

---

## 3. Architecture — recommandation révisée

### 3.1 Ce que change l'exigence de synchronisation

Le choix « téléphone + ordinateur synchronisés » invalide l'architecture purement locale envisagée initialement. Deux appareils qui écrivent les mêmes données exigent un point de vérité commun. Il faut l'assumer plutôt que le contourner par des imports-exports manuels, qui seront abandonnés au bout de trois semaines.

### 3.2 Architecture retenue : local-first avec synchronisation

```
┌─────────────────┐         ┌─────────────────┐
│   Téléphone     │         │   Ordinateur    │
│  PWA + IndexedDB│         │  PWA + IndexedDB│
│   (hors-ligne)  │         │   (hors-ligne)  │
└────────┬────────┘         └────────┬────────┘
         │      file d'attente       │
         └──────────┬────────────────┘
                    ▼
         ┌────────────────────────┐
         │  Backend managé        │
         │  Postgres + stockage   │
         │  fichiers (photos)     │
         └────────────────────────┘
```

**Principes de synchronisation :**

- Écriture toujours locale d'abord, dans IndexedDB. L'interface ne dépend jamais du réseau.
- Chaque modification est empilée dans une file d'attente locale, envoyée dès que le réseau revient.
- Résolution de conflit : **dernière écriture gagnante par enregistrement**, sur horodatage `updated_at`. Acceptable ici car l'exploitant est seul et n'édite jamais la même fiche simultanément depuis deux appareils.
- Suppression logique uniquement (`deleted_at`), jamais de suppression physique — sinon la synchronisation réintroduit les enregistrements supprimés.
- Les photos sont mises en file séparément, compressées avant envoi, et restent consultables localement en attendant.

### 3.3 Pile technique suggérée

| Couche | Choix | Justification |
|---|---|---|
| Interface | React + Vite, PWA installable | Écosystème le mieux couvert par l'assistance au développement |
| Style | Tailwind | Rapidité, cohérence |
| Base locale | IndexedDB via Dexie | Requêtes simples, robuste |
| Backend | Supabase (Postgres managé, stockage fichiers, offre gratuite) | Aucun serveur à administrer, sauvegardes incluses |
| Hébergement | Netlify ou Vercel, offre gratuite | Déploiement par simple envoi de code |
| PDF | Génération côté navigateur | Aucune dépendance serveur |
| IA | API Anthropic, appel depuis l'application | — |

**Point de vigilance :** le backend managé introduit une dépendance externe, contrairement à l'architecture locale pure. Elle est acceptable à condition que **l'export intégral fonctionne sans lui** (M10) : si le service disparaît, les données restent récupérables depuis chaque appareil.

---

## 4. Modèle de données

Champs communs à toutes les tables : `id` (uuid), `created_at`, `updated_at`, `deleted_at`.

### 4.1 Référentiel

**`exploitation`** — enregistrement unique
`napi`, `nom`, `adresse`, `telephone`, `email`, `structure_juridique` (null en V1), `date_debut_activite`

**`rucher`**
`nom`, `commune`, `latitude`, `longitude`, `altitude`, `date_creation`, `date_fermeture`, `environnement` (texte), `notes`

**`ruche`** — le contenant, persiste au-delà de la colonie
`rucher_id`, `numero`, `type` (Dadant 10c, Dadant 12c, Warré, Langstroth, ruchette, autre), `date_acquisition`, `origine`, `qr_code`, `statut` (active, stockée, réformée), `immobilisation_id`

**`colonie`** — le vivant, une ruche peut en héberger plusieurs successivement
`ruche_id`, `date_debut`, `date_fin`, `motif_fin` (mortalité, réunion, division, transfert, essaimage définitif), `origine` (essaim récupéré, division, achat, essaim primaire), `colonie_mere_id`, `race_presumee`, `statut` (active, morte, réunie)

> **Règle structurante.** La séparation ruche / colonie est obligatoire. Sans elle, l'historique devient faux dès le premier transvasement ou la première mortalité suivie d'un repeuplement, et le rendement par ruche perd toute signification.

**`reine`**
`colonie_id`, `annee_naissance`, `origine` (élevée sur place, achetée, superscédure, essaimage), `marquage_couleur`, `marquee` (bool), `clippee` (bool), `lignee`, `date_introduction`, `date_fin`, `motif_fin`

### 4.2 Conduite

**`visite`**
`colonie_id`, `date`, `heure`, `duree_min`, `meteo_temp`, `meteo_conditions`, `meteo_vent`, `type` (contrôle de routine, visite de printemps, visite d'automne, urgence, récolte, traitement),
observations : `nb_cadres_couvain_operculé`, `nb_cadres_couvain_ouvert`, `nb_cadres_provisions`, `nb_cadres_batis`, `population` (échelle 1–5), `reine_vue` (bool), `oeufs_vus` (bool), `ponte_qualite` (compacte / lacunaire / absente / mâles), `cellules_royales` (nombre, type : essaimage / supersédure / sauveté), `tempérament` (1–5), `bâtisse` (1–5), `provisions_kg_estime`, `hausses_posees`,
`score_ponte` (1–5), `anomalies` (multi-choix : bourdonneuse, orpheline, pillage, fausse teigne, mortalité anormale, diarrhée, abeilles noires tremblantes, autre),
`signes_sanitaires` (multi-choix, liste fermée — cf. addendum observation cadre §A.5),
`source_agregats` (saisie_directe | calcule_depuis_cadres),
`observation_libre` (texte, alimenté par dictée), `action_entreprise`, `priorite` (urgente / moyenne / faible), `suivi_prevu_le`

**`observation_cadre`** — une ligne par face de cadre
`visite_id`, `position`, `face` (A/B), `type_cadre`,
occupation en huitièmes (0–8) : `couvain_opercule`, `couvain_ouvert`, `oeufs`, `miel_opercule`, `nectar_frais`, `pollen`, `cellules_vides`, `non_bati`, `couvain_male`,
`score_ponte` (1–5), `homogeneite_stades`, `miel_qualite`, `pollen_diversite`,
`annee_cire`, `etat_bati`, `a_reformer`, `motif_reforme`,
`cellules_royales_nb`, `cellules_royales_type`, `cellules_royales_pos`, `cellules_operculees`,
`signes` (tableau), `test_allumette` (non réalisé / négatif / positif)

**`photo`**
`visite_id`, `observation_cadre_id` (nullable), `fichier_local`, `fichier_distant`, `legende`, `prise_le`, `latitude`, `longitude`, `statut_sync`

**`traitement`**
`colonie_id`, `date_debut`, `date_fin`, `produit`, `numero_amm`, `numero_lot`, `dosage`, `voie` (lanière, sublimation, dégouttement, autre), `motif`, `delai_attente_jours`, `date_fin_delai_attente` (calculée), `ordonnance_document_id`, `conforme_bio` (bool), `notes`

**`comptage_varroa`**
`colonie_id`, `date`, `methode` (lange graissé, sucre glace, lavage alcool, comptage naturel), `duree_jours`, `nb_varroas`, `varroas_par_jour` (calculé), `niveau_alerte` (calculé)

**`nourrissement`**
`colonie_id`, `date`, `type` (sirop léger, sirop lourd, candi, pâte protéinée), `quantite`, `unite`, `composition`, `origine_produit` (acheté / fabriqué / miel de l'exploitation), `notes`

**`mouvement`**
`ruche_id`, `colonie_id`, `date`, `type` (entrée, sortie, transhumance, division, réunion, mortalité, cession, acquisition), `rucher_origine_id`, `rucher_destination_id`, `motif`, `notes`

**`recolte`**
`colonie_id`, `date`, `produit` (miel, cire, propolis, pollen, essaim),
`mode_saisie` (poids simple, poids avec tare, nombre de cadres, ratio de remplissage, pesée hausse par hausse, pesée globale répartie),
`poids_brut`, `tare_hausse`, `nb_hausses`, `nb_cadres`, `ratio_remplissage_pct`, `poids_net` (calculé), `type_miellee`, `notes`

**`tache`**
`colonie_id` (nullable), `rucher_id` (nullable), `libelle`, `date_echeance`, `priorite`, `origine` (manuelle / générée), `regle_origine`, `statut` (à faire, faite, annulée), `visite_declencheuse_id`

**`document`**
`type` (ordonnance, compte rendu de visite sanitaire, résultat d'analyse, récépissé de déclaration, facture, attestation), `date`, `fichier`, `libelle`, `entite_liee_type`, `entite_liee_id`

### 4.3 Économique

**`categorie`**
`libelle`, `sens` (dépense / produit), `groupe` (cheptel, matériel, intrants sanitaires, nourrissement, conditionnement, déplacement, formation, assurance, cotisations, divers / vente miel, vente cire, vente essaims, prestation, aide, don)

**`tiers`**
`nom`, `type` (fournisseur / bénéficiaire), `notes`

**`ecriture`**
`date`, `libelle`, `sens`, `montant`, `categorie_id`, `tiers_id`, `mode_reglement` (espèces, chèque, virement, carte), `justificatif_document_id`,
`niveau_affectation` (exploitation / rucher / ruches),
`rucher_id` (si niveau = rucher),
`cle_repartition` (égale / prorata production / prorata nombre de ruches / manuelle),
`nature` (charge directe / charge indirecte / investissement amortissable / produit),
`immobilisation_id` (si investissement),
`exercice` (année),
`origine_production` (production propre / négoce) — **capté, non exploité en V1**

**`ecriture_affectation`** — table de liaison, une ligne par ruche concernée
`ecriture_id`, `ruche_id`, `quote_part_pct`, `montant_calcule`, `calcule_le`

**`immobilisation`**
`libelle`, `date_acquisition`, `valeur_acquisition`, `duree_amortissement_annees`, `mode` (linéaire), `date_sortie`, `valeur_residuelle`, `justificatif_document_id`

**`amortissement_annuel`** — généré
`immobilisation_id`, `exercice`, `dotation`, `cle_repartition`

---

## 5. Exigences fonctionnelles

Priorités : **M** (must, indispensable à la V1) · **S** (should) · **C** (could).

### M1 — Référentiel

| Réf | Exigence | Prio |
|---|---|---|
| F1.1 | Créer, modifier, archiver ruchers, ruches, colonies, reines | M |
| F1.2 | Rattacher une nouvelle colonie à une ruche existante en clôturant la précédente | M |
| F1.3 | Vue d'ensemble d'un rucher : état de chaque colonie, date de dernière visite, alertes ouvertes | M |
| F1.4 | Ouvrir une fiche ruche par scan de QR code | S |
| F1.5 | Générer et imprimer les étiquettes QR | S |

### M2 — Carnet de visite

| Réf | Exigence | Prio |
|---|---|---|
| F2.1 | Saisir une visite en moins d'une minute : choix prédéfinis, boutons larges (cible tactile ≥ 48 px), aucun champ obligatoire hors date et colonie | M |
| F2.2 | Dictée vocale sur les champs libres, avec structuration ultérieure par l'IA | M |
| F2.3 | Joindre une ou plusieurs photos à la visite, compressées automatiquement | M |
| F2.4 | Pré-remplir la météo depuis la position du rucher, modifiable | S |
| F2.5 | Afficher l'historique des trois dernières visites pendant la saisie | M |
| F2.6 | Mode « tournée » : enchaîner les colonies d'un rucher sans revenir au menu | S |
| F2.7 | Consulter l'évolution d'une colonie sous forme de graphique (cadres de couvain, population, provisions) | S |
| F2.8 | Saisir un score de ponte 1–5 au niveau colonie, en un appui | M |

### M3 — Sanitaire

| Réf | Exigence | Prio |
|---|---|---|
| F3.1 | Enregistrer un traitement avec produit, AMM, lot, dosage et délai d'attente | M |
| F3.2 | Calculer et afficher la date de fin de délai d'attente ; **bloquer par une alerte l'enregistrement d'une récolte pendant ce délai** | M |
| F3.3 | Saisir un comptage varroa et calculer les varroas/jour | M |
| F3.4 | Afficher un niveau d'alerte selon des **seuils saisonniers paramétrables** — valeurs par défaut : avril-mai (faible < 1, modéré 1–5, fort > 5) ; juin-juillet (faible < 2, modéré 2–8, fort > 8) | M |
| F3.5 | Marquer un traitement comme conforme au cahier des charges bio et le signaler dans le registre | M |
| F3.6 | Rattacher une ordonnance ou un compte rendu de visite sanitaire | M |
| F3.7 | Saisir des signes sanitaires depuis une liste fermée | M |
| F3.8 | **Parcours danger sanitaire de catégorie 1** : conduite à tenir statique, obligation de déclaration, prélèvement attendu, tâche urgente créée. Aucun diagnostic, aucun traitement proposé | M |

### M4 — Récoltes

| Réf | Exigence | Prio |
|---|---|---|
| F4.1 | Six modes de saisie au choix (voir `recolte.mode_saisie`), avec calcul automatique du poids net | M |
| F4.2 | Répartir une pesée globale entre les colonies concernées selon un paramétrage | S |
| F4.3 | Gérer les hausses partiellement remplies | S |
| F4.4 | Tableau de rendement par colonie, par ruche et par saison, avec comparaison pluriannuelle | M |

### M5 — Registre d'élevage

| Réf | Exigence | Prio |
|---|---|---|
| F5.1 | Générer un **PDF paginé** couvrant les cinq blocs de l'article 3 de l'arrêté du 5 juin 2000 : fiche synthétique de l'exploitation, encadrement sanitaire, mouvements des animaux, entretien et soins, interventions vétérinaires | M |
| F5.2 | Classement chronologique par type de données, numérotation continue des pages | M |
| F5.3 | Sélection de la période (par défaut : exercice en cours) | M |
| F5.4 | Annexer la liste des documents rattachés (ordonnances, comptes rendus, analyses) | M |
| F5.5 | Rappel trimestriel invitant à imprimer et archiver le registre | S |
| F5.6 | Conserver toutes les données au minimum cinq ans, aucune purge automatique | M |

### M6 — Économique

| Réf | Exigence | Prio |
|---|---|---|
| F6.1 | Saisir une écriture (dépense ou produit) avec l'ensemble des champs du modèle | M |
| F6.2 | Choisir le niveau d'affectation : exploitation, rucher, ou sélection libre de plusieurs ruches | M |
| F6.3 | Choisir la clé de répartition parmi les quatre modes ; saisir des pourcentages en mode manuel | M |
| F6.4 | Photographier un justificatif et le rattacher à l'écriture | M |
| F6.5 | Enregistrer une immobilisation et générer les dotations annuelles | M |
| F6.6 | Tableau de bord : coût de revient au kg par ruche, marge par ruche, contribution au résultat, seuil de rentabilité | M |
| F6.7 | Coût cumulé d'une colonie perdue | S |
| F6.8 | Extraction IA des données d'un justificatif photographié (montant, date, fournisseur) proposées à validation | C |
| F6.9 | Comparaison pluriannuelle par ruche et par poste | S |

### M7 — Tâches et rappels

| Réf | Exigence | Prio |
|---|---|---|
| F7.1 | Créer une tâche manuellement, avec échéance et priorité | M |
| F7.2 | **Générer automatiquement des tâches à partir de l'intervention saisie**, selon des règles paramétrables (voir §6.3) | M |
| F7.3 | Vue « à faire » consolidée, triée par échéance et priorité | M |
| F7.4 | Notification à l'approche d'une échéance | S |

### M8 — Météo

| Réf | Exigence | Prio |
|---|---|---|
| F8.1 | Prévisions sur 7 à 16 jours aux coordonnées du rucher, via une API gratuite exposant les modèles AROME et ARPEGE | S |
| F8.2 | Mise en cache locale de la dernière prévision, consultable hors-ligne | S |
| F8.3 | Signaler les créneaux favorables à une visite (température, vent, absence de pluie) | C |

### M9 — Assistant IA

| Réf | Exigence | Prio |
|---|---|---|
| F9.1 | Poser une question en langage naturel ; le contexte transmis comprend la fiche colonie, ses dix dernières visites, ses traitements et ses comptages | M |
| F9.2 | Structurer une observation dictée en champs de la fiche visite, proposés à validation | M |
| F9.3 | Injecter les comptes rendus de formation de l'exploitant dans le contexte comme source de référence | S |
| F9.4 | Synthèse de début de saison : priorités par colonie | C |
| F9.5 | **Toute proposition de l'IA est soumise à validation explicite ; aucune écriture directe en base** | M |

### M10 — Export et sauvegarde

| Réf | Exigence | Prio |
|---|---|---|
| F10.1 | Export intégral en JSON, **fonctionnant hors-ligne depuis les données locales** | M |
| F10.2 | Export CSV par table, séparateur point-virgule, encodage UTF-8 | M |
| F10.3 | Restauration complète depuis un export JSON | M |
| F10.4 | Sauvegarde manuelle en un geste depuis l'écran d'accueil | M |
| F10.5 | Rappel mensuel de sauvegarde | S |

### M11 — Import de l'existant

| Réf | Exigence | Prio |
|---|---|---|
| F11.1 | Importer `archives_apicoles.csv` (11 colonnes, séparateur point-virgule) vers les tables `visite` et `tache` | M |
| F11.2 | Écran de correspondance des colonnes, avec prévisualisation avant validation | M |
| F11.3 | Conserver le texte original en champ `observation_libre` sans perte | M |

---

### M13 — Observation cadre par cadre

| Réf | Exigence | Prio |
|---|---|---|
| F13.1 | Saisir l'occupation des surfaces en huitièmes de face, réglette de neuf boutons | M |
| F13.2 | Trois modes : cadre remarquable / zone de couvain / cadre par cadre complet | M |
| F13.3 | Score de ponte par cadre | M |
| F13.4 | Cellules royales : nombre, type, position sur le cadre | M |
| F13.5 | Signes sanitaires par cadre, même taxonomie qu'en F3.7 | M |
| F13.6 | Agrégation automatique vers les compteurs de la colonie | M |
| F13.7 | Report de la face A vers la face B comme valeur de départ | S |
| F13.8 | État du cadre : année de cire, réforme, motif | S |
| F13.9 | Représentation graphique du cadre, remplie en direct | S |
| F13.10 | Photos indexées par cadre | S |
| F13.11 | Test de l'allumette, saisie du résultat | S |
| F13.12 | Conversion huitièmes → cm² → cellules, paramétrable par type de ruche | C |
| F13.13 | Comparaison d'un même cadre entre deux visites | C |

---

## 6. Règles de gestion

### 6.1 Calcul du poids net récolté

| Mode | Formule |
|---|---|
| Poids simple | `poids_net = poids_brut` |
| Poids avec tare | `poids_net = poids_brut − (tare_hausse × nb_hausses)` |
| Nombre de cadres | `poids_net = nb_cadres × poids_moyen_cadre` (paramétrable, défaut 2,5 kg) |
| Ratio de remplissage | `poids_net = nb_hausses × capacite_hausse × ratio_remplissage_pct` |
| Pesée hausse par hausse | somme des pesées nettes |
| Pesée globale répartie | poids total réparti entre colonies selon paramétrage |

### 6.2 Répartition analytique

```
Clé « égale »                → montant / nombre de ruches sélectionnées
Clé « prorata production »   → montant × (kg_ruche / kg_total_sélection)
Clé « prorata nb ruches »    → montant / nombre de ruches actives sur la période
Clé « manuelle »             → pourcentages saisis, contrôle de somme = 100 %
```

> **Subtilité déterminante.** La clé « prorata production » n'est calculable qu'après la récolte. L'affectation ne doit donc **pas être figée à la saisie** : elle est recalculée à la clôture de l'exercice, et à chaque nouvelle récolte enregistrée. Le champ `montant_calcule` porte un horodatage `calcule_le` pour rendre ce recalcul traçable. Négliger ce point produit des indicateurs faux et impossibles à diagnostiquer.

### 6.3 Génération automatique de tâches

Règles paramétrables, valeurs par défaut :

| Déclencheur | Tâches générées |
|---|---|
| Introduction d'un cadre de couvain frais dans une colonie orpheline ou bourdonneuse | J+9 : vérifier l'operculation des cellules royales · J+16 : vérifier la naissance · J+28 : contrôler la ponte |
| Cellules royales d'essaimage observées | J+7 : contrôler l'essaimage |
| Division réalisée | J+21 : contrôler la ponte de la nouvelle reine |
| Traitement enregistré avec délai d'attente | à la date de fin de délai : récolte à nouveau autorisée |
| Comptage varroa en niveau « fort » | J+2 : intervenir · J+21 : recompter |
| Comptage varroa en niveau « modéré » | J+14 : recompter |
| Hausse posée | J+14 : contrôler le remplissage |
| Aucune visite depuis 21 jours en saison (avril–septembre) | contrôle de routine |
| Anomalie « Bourdonneuse » signalée | immédiat : secouer les cadres à 50 m de la ruche pour faire tomber les pondeuses |
| Anomalie « Pillage » signalée | J+3 : vérifier l'état de la colonie après le pillage |
| Anomalie « Fausse teigne » signalée | J+14 : contrôler l'évolution de la fausse teigne |
| Anomalie « Mortalité anormale » signalée | J+3 : contrôler la colonie après mortalité anormale |
| Anomalie « Diarrhée » signalée | J+7 : contrôler l'évolution (suspicion nosémose) |
| Anomalie « Abeilles noires tremblantes » signalée | J+3 : contrôler l'évolution |
| Anomalie « Ponte de mâles » signalée | J+10 : recontrôler la ponte |

### 6.4 Agrégation cadre → colonie

Lorsqu'au moins une `observation_cadre` existe pour une visite, `source_agregats` bascule sur `calcule_depuis_cadres` et les compteurs de la colonie deviennent non modifiables :

```
nb_cadres_couvain_opercule = Σ(huitièmes couvain operculé, toutes faces) / 8
nb_cadres_provisions       = Σ(miel operculé + nectar + pollen) / 8
score_ponte (colonie)      = moyenne pondérée par la surface de couvain
```

**Règle cardinale : jamais de double saisie.** Une même information est soit saisie au niveau colonie, soit calculée depuis les cadres, jamais les deux.

### 6.5 Coût de revient

```
coût_de_revient_kg(ruche, exercice) =
    ( charges_directes_affectées
    + quote-part_charges_indirectes
    + dotations_amortissement_affectées )
    / kg_produits(ruche, exercice)
```

Affichage systématiquement accompagné de la série pluriannuelle. **Un ratio isolé sur trois colonies n'a pas de valeur statistique** ; l'interface doit le refléter plutôt que d'afficher un chiffre unique qui suggérerait une précision inexistante.

---

## 7. Exigences non fonctionnelles

| Domaine | Exigence |
|---|---|
| Hors-ligne | 100 % des fonctions de saisie et de consultation ; seuls la météo, l'IA et la synchronisation exigent le réseau |
| Performance | Ouverture d'une fiche colonie < 1 s ; enregistrement d'une visite < 300 ms |
| Ergonomie terrain | Cibles tactiles ≥ 48 px, contraste élevé lisible en plein soleil, aucun geste précis requis |
| Robustesse | Aucune perte de saisie en cas de fermeture inopinée ; brouillon persisté à chaque champ |
| Portabilité | Export intégral indépendant du backend |
| Réversibilité | Suppression logique uniquement ; corbeille consultable |
| Accessibilité | Fonctionne sur navigateur mobile récent, installable en PWA |

---

## 8. Jalons de livraison

| Lot | Contenu | Critère de sortie | Statut |
|---|---|---|---|
| **L1** | M1 + M2 hors photos, en local uniquement, **plus M10 et M11 anticipés** (voir note §1) | Une visite complète saisie au rucher en moins d'une minute, sans réseau | **Livré 10/08/2026** |
| **L1+** | Complément à L1 : score de ponte, taxonomie sanitaire, parcours danger catégorie 1, table `observation_cadre` au schéma sans interface | Cocher un signe de catégorie 1 affiche la conduite à tenir | **À ouvrir maintenant** |
| **Revue ergo** | Révision de l'ergonomie après 3 visites réelles avec L1+ | Corrections identifiées et arbitrées | À faire avant L2 |
| **L2** | Synchronisation + photos + dictée + revue de tournée + **M13 observation cadre par cadre** | Une visite saisie sur le téléphone apparaît sur l'ordinateur ; un cadre remarquable se saisit en 15 s | **Livré 13/08/2026** (vérifié techniquement de bout en bout ; confirmation en conditions réelles de rucher à faire par l'exploitant, sans bloquer la suite — cf. `observation_cadre_et_cartographie_lots.md`) |
| **L2.2** | M3 sanitaire : traitements, comptages varroa, nourrissement, rappels fixes (§6.3), export PDF ciblé aux deux blocs sanitaires du registre (F5.1) — cf. `brief_L2.2_sanitaire.md` | Un traitement et un comptage varroa se saisissent, génèrent automatiquement les trois rappels prévus, et s'exportent en PDF sur une période choisie | **Livré 12/08/2026** |
| **L3** | M4 + M7 + reste de M3 (mouvements, récoltes, rendement, tâches manuelles) | Les tâches se génèrent seules après une intervention | **Livré 13/08/2026** (vérifié techniquement de bout en bout — récolte 6 modes, interlock délai d'attente F3.2, tableau de rendement, mouvements, 8 règles §6.3, création manuelle et vue "à faire" consolidée ; confirmation en conditions réelles de rucher à faire par l'exploitant, sans bloquer la suite) |
| **M8** | Module météo (F8.1-F8.3) : prévisions 7-16 jours aux coordonnées du rucher, cache hors-ligne, repère de créneau favorable | La prévision d'un rucher s'affiche, reste consultable hors-ligne, sans clé ni coût | **Livré 15/08/2026** |
| **L3bis** | Ingestion météo quotidienne + moteur de règles (3 règles pilotes) — cf. addendum M12 | — | Planifié |
| **L4** | M5 (registre complet, 5 blocs — réutilise la génération PDF de L2.2 pour 2 des 5 blocs) | Un PDF de registre conforme est produit et imprimé | Planifié |
| **L5** | M6 | Le coût de revient au kg d'une ruche est calculé sur une saison réelle | Planifié |
| **L6** | M9 + reste de M10/M11 (export CSV par table, rappel mensuel) | L'historique CSV est importé, l'export intégral fonctionne hors-ligne | Planifié |

**Recommandation de séquencement.** Ne pas engager L3 avant d'avoir utilisé L1 et L2 sur au moins trois visites réelles au rucher. La cause la plus fréquente d'abandon d'un outil personnel est une V1 trop ambitieuse livrée d'un bloc. **L1 est livré. L1+ s'ouvre maintenant** — il complète le socle sans rien reconstruire. **L2 est devenu le lot le plus lourd de la trajectoire** du fait de l'intégration de M13 : le séquencer en interne (synchronisation → photos → dictée → revue → cadre par cadre → agrégation), avec passage au rucher entre chaque étape.

---

## 9. Critères d'acceptation de la V1

1. Une visite complète est saisie au rucher, sans réseau, en moins d'une minute, gants aux mains.
2. Les données saisies sur le téléphone sont visibles sur l'ordinateur sans intervention manuelle.
3. Le registre d'élevage s'exporte en PDF paginé et couvre les cinq blocs réglementaires.
4. Une dépense est affectée à trois ruches avec une clé au prorata de la production, et le montant se recalcule après enregistrement d'une récolte.
5. Le coût de revient au kg est calculé pour chaque ruche sur une saison.
6. L'export intégral s'exécute et se restaure hors-ligne.
7. Le fichier `archives_apicoles.csv` est importé sans perte d'information.
8. Trois tâches sont générées automatiquement après l'enregistrement d'une intervention.

---

## 10. Points ouverts

- Choix du prestataire de backend managé — à confirmer au moment du développement, l'offre gratuite évoluant
- Paramétrage du poids moyen d'un cadre récolté, à caler sur les premières récoltes réelles
- Volume et coût d'usage de l'API IA à mesurer sur une saison avant de généraliser l'usage F9.2
- Modalités d'archivage long terme du registre imprimé (papier ou PDF horodaté)

---

## 11. Réserve d'idées (mise à jour du 11/08/2026)

Pierre a retravaillé un cahier des charges fonctionnel et rédigé un cahier des charges ergonomique complémentaires. Une partie de leur contenu est générique (gabarit non spécifique à cet usage) et a été écartée (§12). Le reste constitue une **réserve d'idées non affectée à un lot** — à cadrer ensemble, fonctionnalité par fonctionnalité, au moment d'ouvrir le lot concerné. Rien ci-dessous n'est un engagement de développement.

### Saisie
- Dictée vocale généralisée à tous les écrans de saisie (au-delà du champ libre déjà prévu en F2.2)
- Identification d'une ruche par scan QR code ou NFC (prolonge F1.4/F1.5)

### Analyse et restitution
- Tableaux de bord personnalisables (widgets au choix, réorganisables par glisser-déposer)
- Graphiques interactifs exportables en image (PNG/SVG)
- Analyse prédictive et suggestions d'actions par IA — à articuler avec le moteur de règles déterministe de l'addendum M12, qui reste la seule source de recommandations actionnables (l'IA contextualise, elle ne décide jamais seule)

### Contenu et accompagnement
- Fil d'actualités apicoles (alertes sanitaires, conseils de saison)
- Assistant conversationnel de support (chatbot) — distinct de l'assistant IA contextuel M9, qui répond sur les données de l'exploitant, pas sur l'usage de l'application

### Technique
- API ouverte pour intégration avec d'autres outils apicoles ou agricoles
- Conformité WCAG 2.1 (contrastes, navigation clavier, lecteurs d'écran, tailles de police ajustables)

### Navigation
- Barre de navigation basse + menu latéral pour les options secondaires — à réconcilier avec le principe « pas de menu complexe » de l'addendum ergonomie si retenu ; ne remplace pas l'ergonomie gantée/tactile déjà validée pour l'écran de saisie

---

## 12. Exclusions actées (mise à jour du 11/08/2026)

Éléments proposés dans les documents retravaillés de Pierre, explicitement écartés — à ne pas réintroduire sans nouvel arbitrage explicite :

| Élément proposé | Raison de l'exclusion |
|---|---|
| Mode sombre/clair | Contre-indiqué en extérieur — l'écran est lu en plein soleil, texte foncé sur fond clair uniquement (déjà proscrit par l'addendum ergonomie) |
| Champs obligatoires (astérisque) | Contredit le principe « aucun champ obligatoire » — une visite partielle vaut mieux qu'une visite abandonnée |
| Authentification forte (2FA) | L'application reste mono-utilisateur, sans gestion de comptes (§2 « Utilisateurs ») |
| Applications natives iOS/Android/desktop séparées | La PWA unique (React/Vite) est confirmée comme architecture cible, y compris pour L2 |


---

## 13. Arbitrages actés — 11 août 2026

| Question | Décision |
|---|---|
| Placement de l'observation cadre par cadre | Module **M13**, intégré au **lot L2** — pas de lot séparé |
| Table `observation_cadre` | **Au schéma dès L1+**, sans aucune interface |
| Score de ponte au niveau colonie | **En L1+**, enregistré sans automatisme |
| Parcours danger sanitaire de catégorie 1 | **En L1+**, contenu réglementaire statique |
| Cellules royales / tempérament / bâtisse au niveau visite | **Assignés à L1** le 11/08/2026 — déjà dans le modèle §4.2, jamais construits ni assignés à un lot avant cette date |

### Frontière posée pour le socle L1/L1+

Le socle peut contenir du **contenu réglementaire statique** — le parcours danger sanitaire en est l'unique cas, justifié par une obligation de déclaration qui ne se discute pas. Il ne contient **aucune heuristique de conduite** : le score de ponte est enregistré et ne déclenche rien, la règle qui le relie au comptage varroa appartient au moteur M12 du lot L3bis.

### Dépendances différées du parcours sanitaire

L'entrée automatique au registre d'élevage (L4) et la génération automatisée de tâches (L3bis) n'existent pas dans le socle. Le parcours y crée une tâche d'origine manuelle et marque la visite. Les données saisies alimenteront rétroactivement les deux modules — aucune ressaisie.

---

## 14. Arbitrages actés — 12 août 2026

| Question | Décision |
|---|---|
| Création d'un lot sanitaire dédié | **Nouveau lot L2.2**, inséré entre L2 (synchronisation, livrée) et L3. Le reste de L2 (photos, dictée, revue de tournée, M13) reste en pause, repris après L2.2 |
| Contenu transposé vers L2.2 | Traitements, comptages varroa, nourrissement et conformité bio (ex-L3.1/L3.3-L3.5) ; les trois rappels fixes déjà écrits en §6.3 (traitement → délai, varroa fort, varroa modéré), auparavant ambigus entre L3 et L3bis (cf. ancien §3 du brief, devenu sans objet) ; documents rattachés à un traitement (ex-L3.10, périmètre traitement uniquement) |
| Export PDF sanitaire | **Transposé en L2.2** : les deux blocs « encadrement sanitaire » et « interventions vétérinaires » de F5.1 (arrêté du 5 juin 2000), sur une période sélectionnable. Le registre complet (5 blocs, pagination continue, annexe documentaire — F5.1-F5.4 intégralement) **reste en L4**, qui réutilisera cette génération PDF plutôt que de la reconstruire |
| Moteur de règles météo (addendum M12) | **Reste exclu de L2.2**, sans exception — confirmé explicitement malgré la transposition : R-COUV-01 et toute règle météo-dépendante ne sont pas des rappels fixes mais une heuristique de conduite, hors du carnet de bord à tout lot |
| Reste de L3 après transposition | Mouvements de ruches/colonies, récoltes (M4), rendement, tâches manuelles/vue consolidée (M7 générique) |

Détail complet du lot : `brief_L2.2_sanitaire.md`.

---

## 15. Arbitrages actés — 13 août 2026 (lot L3)

| Question | Décision |
|---|---|
| Notification à l'approche d'une échéance (F7.4, priorité S) | **Pas de notification push OS.** La bannière "urgent" déjà en place sur l'écran d'accueil (échéance dépassée) plus la nouvelle vue "à faire" consolidée (F7.3) jouent ce rôle en PWA offline-first, sans infrastructure serveur de push à construire pour un usage solo |
| `rucher_origine_id`/`rucher_destination_id` du mouvement (transhumance) | Restent au schéma, non exposés dans l'écran : l'exploitation ne compte qu'un seul rucher à ce jour — un sélecteur à une seule option n'apporterait rien. À rouvrir si un second rucher entre en gestion |
| Capacité pleine d'une hausse (mode "ratio de remplissage", §6.1) | **Aucun défaut inventé** : contrairement à `poids_moyen_cadre` (2,5 kg donné explicitement par le cahier des charges), aucune valeur n'est fournie pour la capacité d'une hausse — champ de saisie obligatoire pour ce mode plutôt qu'une estimation non validée |
| "Introduction d'un cadre de couvain frais" (§6.3, cascade J+9/J+16/J+28) | Aucun champ `visite` dédié dans le modèle de données — ajouté comme signal ponctuel de l'écran de saisie (jamais persisté en base), visible uniquement quand une anomalie orpheline/bourdonneuse est cochée, condition du déclencheur |
| `hausses_posees` (§4.2, jamais construit avant cette date) | Exposé comme interrupteur dans l'écran de saisie visite, aux côtés de "Cellules royales" — déclenche le rappel "Contrôler le remplissage" (§6.3) |
| "Aucune visite depuis 21 jours en saison" (§6.3) | Seule règle du moteur qui ne naît pas d'une saisie mais de l'écoulement du temps — vérifiée au chargement de l'écran d'accueil plutôt que dans un écran dédié ; réutilise le seuil déjà défini pour l'état visuel "à visiter" (`SEUIL_JOURS_A_VISITER`, 21 jours) |

---

## 16. Arbitrages actés — 14 août 2026 (retours d'usage réel)

Quatre frictions remontées après un usage réel prolongé (fiche visite et sanitaire consultées séparément, pas d'historique consolidé, huitièmes jugés trop fins, historique cadre par cadre introuvable). Décisions prises avant correction :

| Question | Décision |
|---|---|
| Définition d'une "saison" (historique consolidé, export) | **Campagne apicole avril-mars**, pas année civile — hivernage à hivernage, plus proche du cycle réel de la colonie que le calendrier |
| Contenu de l'export consolidé | **Tout** : visite + sanitaire (traitement, comptage varroa, nourrissement) + récoltes + mouvements (L3), pas seulement visite + sanitaire comme demandé au premier abord — le lot L3 a été livré entre-temps |
| Occupation des faces de cadre : huitièmes → pourcentages | Échelle fixe **0/10/25/50/80/99 %** (0 % ajouté implicitement aux cinq valeurs demandées, pour garder la possibilité de saisir explicitement "rien constaté" plutôt que de forcer un premier palier à 10 %) |
| Export CSV consolidé vs. export CSV par table (F10.2, prévu en L6) | **Les deux coexisteront** : celui-ci est une vue humaine, une ligne par événement, colonnes communes + détail texte ; F10.2 restera une sauvegarde fidèle table par table, non construite dans ce lot |

Détail technique : `couvain_opercule`, `couvain_ouvert`, `oeufs`, `miel_opercule`, `nectar_frais`, `pollen`, `cellules_vides`, `non_bati`, `couvain_male` (§4.2 `observation_cadre`) stockent désormais un pourcentage (0-100) au lieu d'un huitième (0-8) — migration Dexie des observations existantes (× 12,5, arrondi). La formule d'agrégation §6.4 est mise à jour en conséquence (division par 100 au lieu de 8).

---

## 17. Arbitrages actés — 14 août 2026 (identité visuelle, multi-rucher, écran d'accueil)

### Identité visuelle

La fiche visite était jugée trop terne ("le noir et blanc c'est triste"). Nouvelle palette d'accent — **miel, vert, bordeaux**, en plus du noir et blanc déjà en place — appliquée d'abord à la fiche visite (mosaïque de 4 boutons colorés en haut d'écran remplaçant les liens texte en pied de page) puis étendue à l'écran d'accueil et aux boutons "+" des écrans de création. Les pastilles d'état (urgent/action/à visiter/normale) gardent leur palette pastel existante, non retouchée — c'était déjà la seule couleur de l'interface avant ce jour, elle n'entrait pas en conflit. Le bloc "Colonie" (Population/Tempérament/Bâtisse) est replié par défaut sur la fiche visite, déplié au clic.

### Multi-rucher et écran d'accueil

**F1.1 "Créer, modifier, archiver ruchers, ruches, colonies, reines"** était resté non construit malgré son rattachement théorique à L1 (livré 10/08/2026) : un seul rucher et trois ruches, saisis une fois pour toutes dans `db/seed.js`, aucun écran ne permettait d'en ajouter. Complété aujourd'hui à la demande de l'exploitant, à l'échelle de rucher et ruche (colonies/reines toujours créées uniquement via un rucher/ruche neuf, pas d'écran dédié à leur gestion indépendante — hors périmètre de cette demande).

| Question | Décision |
|---|---|
| Nouvel écran d'accueil | **Remplace l'écran de lancement** — l'application ouvre sur la liste des ruchers ; VueEnsemble (la tournée) s'ouvre après en avoir choisi un. Regroupe aussi les utilitaires qui ne sont pas propres à un rucher (sauvegarde JSON, restauration, export PDF sanitaire, export CSV consolidé, vue "à faire" toutes ruchers) |
| Emplacements Économique (M6) et Météo (M8) | Réservés sur l'écran d'accueil, désactivés ("à venir") — modules non construits, pas de contenu à afficher encore |
| Import CSV | Reste propre à un rucher (résout les numéros de ruche dans son contexte) — accessible depuis VueEnsemble, pas depuis l'accueil |
| Archivage d'une ruche | Retire la ruche de l'ordre de tournée du rucher et passe son statut à "réformée" — la ruche (le contenant) reste en base, comme le veut le modèle de données (§4.2, "persiste au-delà de la colonie"), jamais de suppression définitive |

**Limite connue, non corrigée dans ce lot** : `resoudreLignes` (import CSV, `lib/csv.js`) résout les numéros de ruche sur `db.ruche.toArray()`, toutes ruches confondues — avec plusieurs ruchers portant chacun une "Ruche 1", un import pourrait cibler la mauvaise ruche si les numéros se recoupent entre ruchers. Le sélecteur de colonie de la fiche visite, lui, a été corrigé pour n'afficher que les colonies du rucher ouvert (`SaisieVisite` reçoit désormais `rucherId`) — c'était un vrai bug (deux "Ruche 1" indiscernables dans la liste dès qu'un second rucher existe), constaté et corrigé pendant la vérification de ce lot.

### Transhumance — déplacer une ruche d'un rucher à un autre

Demandé juste après l'ouverture du multi-rucher. Réactive `mouvement.rucher_origine_id`/`rucher_destination_id` (§4.2), au schéma depuis le début mais non exposés jusqu'ici faute d'un second rucher pour leur donner un sens (cf. arbitrage L3 ci-dessus, §15) — la ruche que la ligne 556 laissait dormir.

Le type "Transhumance" de l'écran Mouvement (`SaisieMouvement.jsx`) fait désormais un geste réel, pas seulement une entrée de journal : sélectionner un rucher de destination y déplace effectivement la ruche (`ruche.rucher_id`, retirée de l'ordre de tournée d'origine, ajoutée à celui de destination) en plus d'enregistrer la trace `mouvement`. La colonie suit sans rien à faire — elle est rattachée à la ruche (`colonie.ruche_id`), jamais directement au rucher. Aucun autre type de mouvement ne touche à la structure ; transhumance est le seul à agir, tous les autres restent un journal.

## 18. Arbitrages actés — 15 août 2026 (module météo, M8)

Demandé via la place réservée à l'écran d'accueil ("Météo — à venir", §17). Couvre F8.1, F8.2 et F8.3 tels que décrits §5 — **pas** l'ingestion quotidienne ni le moteur de règles de l'addendum M12/L3bis, qui restent un lot distinct et non entamé (cf. ligne 544 : "reste exclu... sans exception").

| Point | Décision |
|---|---|
| API (F8.1) | [Open-Meteo](https://open-meteo.com), gratuite, sans clé pour un usage non commercial. Sélectionne automatiquement le meilleur modèle au point demandé (`best_match`), ce qui inclut AROME/ARPEGE (Météo-France) sur le territoire français — vérifié par appel direct à l'API avant intégration, conformément à l'exigence du cahier des charges |
| Portée (F8.1) | Prévision journalière (température min/max, vent max, précipitations, code météo), 16 jours, aux coordonnées du rucher (`rucher.latitude`/`longitude`, déjà au schéma depuis le multi-rucher) |
| Cache (F8.2) | Une ligne par rucher (`meteo_cache`, table locale, non synchronisée — chaque appareil retélécharge la sienne), écrasée à chaque succès. En cas d'échec réseau, l'écran retombe sur cette dernière prévision connue avec un bandeau "Hors-ligne — dernière prévision récupérée le [date]" |
| Créneau favorable (F8.3) | Heuristique fixe et volontairement simple (température ≥ 15°C, vent ≤ 20 km/h, précipitations < 1 mm), affichée comme un simple repère visuel (✓), pas une recommandation. **Ce n'est pas le moteur de règles paramétrable de M12** — celui-ci reste hors périmètre |
| Rucher sans coordonnées | Message explicite + raccourci vers la fiche rucher plutôt qu'un écran vide ou une erreur silencieuse |
| Pré-remplissage météo en fiche visite (F2.4) | Non traité dans ce lot — l'écran météo est autonome, accessible depuis l'accueil uniquement. F2.4 resterait à faire séparément si souhaité |

## 19. Arbitrages actés — 15 août 2026 (station Netatmo personnelle)

Hors périmètre initial du cahier des charges (aucune ligne M ne le prévoyait) : demandé directement par l'exploitant, qui possède une station Netatmo à domicile. Complète l'écran Météo avec des relevés **réels** (domicile), à distinguer des prévisions Open-Meteo (§18) qui restent, elles, par rucher.

| Point | Décision |
|---|---|
| Architecture | Première brique serveur de l'application (jusqu'ici entièrement statique côté client + Supabase). Une fonction Netlify (`netlify/functions/netatmo-meteo.mjs`) fait l'intermédiaire : le `client_secret` Netatmo et la clé `service_role` Supabase n'existent **jamais** côté navigateur |
| Rotation du refresh_token | Netatmo régénère le refresh_token à **chaque** rafraîchissement (RFC OAuth2, depuis avril 2023) — l'ancien devient invalide. D'où une table Supabase dédiée (`netatmo_credentials`, RLS activé sans policy = verrouillée à `service_role` uniquement) plutôt qu'une variable d'environnement figée, qui se serait cassée au premier rafraîchissement |
| Fréquence de rafraîchissement | L'access_token (valable 3h) est réutilisé tel quel tant qu'il n'est pas expiré — pas de rafraîchissement à chaque ouverture de l'écran, pour limiter les rotations inutiles du refresh_token |
| Affichage | Carte "Ma station (domicile)" en tête de l'écran Météo (pas rattachée à un rucher précis) — un relevé par module Netatmo détecté (intérieur, extérieur, pluie, vent selon l'équipement), dégradation silencieuse si la station n'est pas configurée ou injoignable |
| Secrets | `NETATMO_CLIENT_ID`, `NETATMO_CLIENT_SECRET` et `SUPABASE_SERVICE_ROLE_KEY` en variables d'environnement Netlify (jamais préfixées `VITE_`, donc jamais embarquées dans le bundle client) |

## 20. Arbitrages actés — 15 août 2026 (tâches générées par anomalie, §6.3)

Jusqu'ici, seules les anomalies « orpheline » et « bourdonneuse » déclenchaient une génération de tâches (§6.3), et uniquement si le toggle « cadre de couvain frais introduit » était activé — c'est le suivi de cette intervention précise, pas de l'anomalie en elle-même. Demandé par l'exploitant : étendre la génération automatique aux 7 autres anomalies, chacune directement (signaler l'anomalie + enregistrer la visite suffit, aucune condition supplémentaire). Contenu et délais proposés par l'assistant puis validés par l'exploitant avant implémentation.

| Point | Décision |
|---|---|
| « Bourdonneuse » | Reçoit en plus une tâche immédiate et indépendante du toggle couvain (« secouer les cadres à 50 m... ») — la cascade J+9/J+16/J+28 existante reste, elle, conditionnée au toggle, inchangée |
| « Orpheline » | Non concernée par cette extension — seule, sans cadre de couvain introduit, elle ne déclenche encore aucune action définie |
| « Autre » | Volontairement exclue — libellé trop générique pour une tâche actionnable |
| Implémentation | Table de règles `REGLES_ANOMALIE` (anomalie → délai, libellé, priorité, `regle_origine`) dans `SaisieVisite.jsx`, même convention que les 8 règles existantes (pas de déduplication — comme toutes les règles déclenchées à la sauvegarde d'une visite, à la différence de la règle "21 jours" recalculée à chaque chargement) |
| Limite connue, non corrigée dans ce lot | La revue de tournée (`RevueTournee.jsx`, saisie vocale) n'appelle aucune règle §6.3 — ni les nouvelles, ni les 8 existantes (essaimage, hausse posée, cascade couvain, et même la tâche urgente de suspicion catégorie 1). Une visite saisie par dictée vocale ne génère donc aucune tâche automatique. Gap constaté pendant la vérification, existant avant ce lot, non corrigé ici — signalé séparément |
