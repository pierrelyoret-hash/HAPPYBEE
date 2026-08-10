# Cahier des charges fonctionnel — V1
## Application de gestion du rucher et de l'activité apicole

**Version** 1.0 — août 2026
**Destinataire** développement assisté (Claude Code)
**Exploitant** Pierre Lyoret — NAPI A5220476 — Dompierre-les-Ormes (71520), ~450 m d'altitude

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

### Hors V1, à conserver dans le modèle de données

- Module verger mellifère (plantations, floraisons, corrélation aux miellées) → **V2**
- Exports fiscaux : livre de recettes micro-BA, distinction production propre / négoce → **activés à la création de la structure**
- Photos indexées par cadre et analyse d'image par IA → **V2**
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
| Volumétrie | 3 à 30 colonies, 1 à 3 ruchers, horizon 10 ans |
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
`anomalies` (multi-choix : bourdonneuse, orpheline, pillage, fausse teigne, mortalité anormale, diarrhée, abeilles noires tremblantes, autre),
`observation_libre` (texte, alimenté par dictée), `action_entreprise`, `priorite` (urgente / moyenne / faible), `suivi_prevu_le`

**`photo`**
`visite_id`, `fichier_local`, `fichier_distant`, `legende`, `prise_le`, `latitude`, `longitude`, `statut_sync`

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

### M3 — Sanitaire

| Réf | Exigence | Prio |
|---|---|---|
| F3.1 | Enregistrer un traitement avec produit, AMM, lot, dosage et délai d'attente | M |
| F3.2 | Calculer et afficher la date de fin de délai d'attente ; **bloquer par une alerte l'enregistrement d'une récolte pendant ce délai** | M |
| F3.3 | Saisir un comptage varroa et calculer les varroas/jour | M |
| F3.4 | Afficher un niveau d'alerte selon des **seuils saisonniers paramétrables** — valeurs par défaut : avril-mai (faible < 1, modéré 1–5, fort > 5) ; juin-juillet (faible < 2, modéré 2–8, fort > 8) | M |
| F3.5 | Marquer un traitement comme conforme au cahier des charges bio et le signaler dans le registre | M |
| F3.6 | Rattacher une ordonnance ou un compte rendu de visite sanitaire | M |

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

### 6.4 Coût de revient

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

| Lot | Contenu | Critère de sortie |
|---|---|---|
| **L1** | M1 + M2 hors photos, en local uniquement | Une visite complète saisie au rucher en moins d'une minute, sans réseau |
| **L2** | Synchronisation deux appareils + photos | Une visite saisie sur le téléphone apparaît sur l'ordinateur après retour du réseau |
| **L3** | M3 + M4 + M7 | Les tâches se génèrent seules après une intervention |
| **L4** | M5 | Un PDF de registre conforme est produit et imprimé |
| **L5** | M6 | Le coût de revient au kg d'une ruche est calculé sur une saison réelle |
| **L6** | M9 + M10 + M11 | L'historique CSV est importé, l'export intégral fonctionne hors-ligne |

**Recommandation de séquencement.** Ne pas engager L3 avant d'avoir utilisé L1 et L2 sur au moins trois visites réelles au rucher. La cause la plus fréquente d'abandon d'un outil personnel est une V1 trop ambitieuse livrée d'un bloc.

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
