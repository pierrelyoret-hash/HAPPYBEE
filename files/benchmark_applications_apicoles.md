# Benchmark des applications de gestion apicole
### Préalable au cahier des charges fonctionnel V1 — août 2026

---

## 1. Méthode et avertissement

Douze solutions examinées : sites éditeurs, fiches App Store / Google Play, dépôts GitHub, forums apicoles francophones, sources réglementaires.

**Biais à connaître :** une part importante des comparatifs francophones disponibles en ligne (« top 5 des applications », « comparatif 2026 ») est publiée par Beekube lui-même, dans son centre d'aide. Ces contenus sont informatifs mais orientés — les points faibles de Beekube y sont systématiquement minorés, ceux des concurrents accentués. Ils ont été utilisés pour identifier des fonctionnalités, jamais pour classer les solutions.

---

## 2. Panorama des solutions

### Solutions françaises

| Solution | Modèle économique | Cible | Point fort distinctif | Limite majeure |
|---|---|---|---|---|
| **Beekube** | Gratuit, ruches illimitées | Amateur → semi-pro | Registre d'élevage généré automatiquement ; météo haute résolution (AROME/ARPEGE, 2,5 km, 16 j) ; QR code par ruche ; ergonomie pensée pour les gants ; saisie < 1 min | **Pas de mode hors-ligne** ; aucun module économique |
| **BeePerf** | Freemium (10 ruches gratuites) | Amateur, petit cheptel | Prise de notes colonie par colonie ; export du registre en Excel modifiable | Registre en option payante ; pas de volet économique |
| **Melys** | Gratuit en phase de test | Professionnel, gros cheptels | Chaîne complète élevage de reines → extraction → fûts → mise en pot ; QR codes sur nucléis ; traçabilité produit fini | Conçu pour des **ruchers homogènes**, logique inadaptée à 3 colonies suivies individuellement |
| **BeeGuard** | 36 € HT/an + capteurs | Rucher connecté | Poids, température, alertes vol/essaimage ; registre alimenté par les capteurs | Peu d'intérêt sans les capteurs ; pas de suivi des reines |
| **apiDan** | Gratuit | Amateur/pro | Inclut gestion de stock et vente | Ensemble hétérogène d'outils, peu maintenu |

### Solutions internationales

| Solution | Modèle économique | Point fort distinctif | Limite majeure |
|---|---|---|---|
| **HiveBook** (US) | Gratuit 5 ruches / Pro ~40 $/an / Premium ~80 $/an | **La plus proche de ton besoin** : 100 % hors-ligne, données locales, dépenses + recettes, scan IA des justificatifs, briefing IA quotidien, chat IA contextuel, calendrier de floraison, suivi des certifications bio | Reporting fiscal US (Schedule F) ; aucun registre d'élevage français |
| **Apiarist** (iOS) | Payant | Stockage local, fonctionne sans réseau, photos sur ruchers/ruches/visites, suivi financier recettes/dépenses, interface en français | iOS uniquement ; finances rudimentaires |
| **Beeing** (GR) | Gratuit illimité | Annonce un suivi de **rentabilité par ruche et par rucher** | Solution récente, peu de recul ; cloud obligatoire |
| **BeeKeepPal** | Abonnement | Gestion clients / fournisseurs / produits ; comparaison de rentabilité d'année en année | Interface datée |
| **HiveTracks** (US) | Freemium | Référence historique ; guidage de visite et recommandation de la prochaine intervention | **Aucun module économique** — demande utilisateur explicite restée sans réponse en 2025 |
| **ApiNote / Apiary Book** | Freemium | Assistant vocal IA pour saisie mains libres ; chat IA apicole | Multi-fonctions mais peu profond |
| **ApiManager** | Freemium | Rôles multi-utilisateurs (accès complet / édition / lecture seule) | Peu spécifique |

### Open source

| Solution | Intérêt |
|---|---|
| **BEEP** (NL, Laravel + Vue, GitHub) | **Modèle de données standardisé**, construit à partir d'une trentaine de sources dont le COLOSS BEEBOOK, la Healthy-B toolbox et le guide FAO des maladies. Checklists de visite personnalisables, API ouverte, export brut. C'est la meilleure base conceptuelle disponible pour ton modèle de données. Aucun volet économique, aucun registre français. |
| **Gratheon** | Vision par ordinateur sur l'entrée de ruche (comptage, détection varroa). Hors périmètre, mais montre où va la filière. |

---

## 3. Analyse fonctionnelle : ce qui mérite d'être repris

### 3.1 Modèle d'objets — le point le plus souvent raté

La hiérarchie correcte comporte **quatre niveaux**, pas trois :

```
Exploitation → Rucher (emplacement, GPS) → Ruche (contenant) → Colonie (le vivant)
```

Beaucoup d'applications confondent ruche et colonie. C'est une erreur structurante : lors d'un transvasement, d'une mortalité suivie d'un repeuplement, ou de la récupération d'un essaim, **la colonie change alors que la ruche reste**. Sans cette séparation, l'historique devient faux et le suivi de rendement individuel perd son sens. Melys et BEEP font la distinction.

**Verdict V1 : à reprendre impérativement.**

### 3.2 Ergonomie de saisie terrain

Le consensus du marché est net et convergent : **objectif de moins d'une minute par ruche**. Les moyens observés : formulaires à choix prédéfinis avec saisie de texte minimale, boutons larges utilisables avec des gants, QR code collé sur la ruche pour ouvrir directement sa fiche.

À compléter par ce que le marché ne propose quasiment pas et qui correspond à ton usage : **la saisie vocale**, avec transcription puis structuration automatique par l'IA. ApiNote est le seul à proposer un assistant vocal.

**Verdict V1 : à reprendre, avec la dictée en mode d'entrée principal.**

### 3.3 Checklist de visite

BEEP est la référence : catégories de données standardisées et traduites, checklists configurables selon le protocole. À conserver comme socle : forces (cadres de couvain operculé / ouvert, cadres de provisions, population estimée), présence et qualité de ponte, observation de la reine, tempérament, état de la bâtisse, réserves.

**Verdict V1 : reprendre le modèle BEEP, l'aligner sur tes 11 colonnes existantes.**

### 3.4 Photos

Beekube et Apiarist attachent des photos aux interventions. Aucun ne va plus loin.

Amélioration à concevoir : **photo indexée par cadre** (numéro de cadre, face, horodatage, géolocalisation), ce qui permet une comparaison entre visites successives et alimente ensuite l'analyse IA. C'est la brique qui rend l'appel à Claude réellement utile — une photo isolée ne vaut rien, une série datée d'un même cadre vaut un diagnostic.

### 3.5 Sanitaire et varroa

Beekube enregistre les comptages et affiche un niveau d'alerte calculé automatiquement, puis génère les tâches aux dates clés du protocole.

**Contrôle de cohérence :** ce mécanisme correspond exactement aux seuils saisonniers vus dans ta formation (avril-mai : intervention au-delà de 5 varroas/jour ; juin-juillet : au-delà de 8). Ces seuils sont paramétrables dans ton outil — c'est un avantage sur toute application du marché, dont les seuils sont figés.

À ajouter, absent partout : **délai d'attente après traitement** et **traçabilité des intrants au regard du cahier des charges bio**.

### 3.6 Récoltes — meilleure implémentation observée

Beekube propose cinq modes de saisie complémentaires, refondus en 2025 : poids simple, poids avec tare de hausse (calcul automatique du miel net), nombre de cadres récoltés, ratio de remplissage en pourcentage, pesée hausse par hausse ou pesée globale répartie automatiquement — avec prise en compte des hausses partiellement remplies.

C'est la fonctionnalité la mieux conçue de tout le panel : elle épouse les habitudes de terrain au lieu de les contraindre.

**Verdict V1 : à reprendre tel quel.** C'est aussi la source de données du rendement par ruche, donc du volet économique.

### 3.7 Reines et génétique

Fiche reine (année, origine, marquage, lignée), traçabilité F0/F1/F2, notation des performances. Beekube a intégré une analyse BLUP.

**Verdict V1 : fiche reine oui, génétique statistique non.** Le BLUP n'a aucun sens en dessous d'une vingtaine de colonies.

### 3.8 Registre d'élevage français

Généré automatiquement par Beekube, BeePerf (option payante) et BeeGuard. **Aucune solution internationale ne le produit.**

Contrainte technique confirmée : le registre suppose un support imprimable et paginé, l'usage informatique étant admis avec impression trimestrielle ou lors de la visite du vétérinaire. Ton application doit donc produire un **PDF paginé**, pas seulement un écran de consultation.

### 3.9 Météo

Beekube exploite les modèles AROME et ARPEGE de Météo-France, ICON, GFS et HRRR, à 2,5 km de résolution sur 16 jours, calés sur le GPS du rucher.

Ces mêmes modèles sont accessibles gratuitement via l'API Open-Meteo, sans clé pour un usage non commercial. **Verdict V1 : à reprendre, coût nul.** Pertinent à 450 m d'altitude en Haut-Mâconnais, où les conditions décrochent nettement de la plaine mâconnaise.

### 3.10 Fonctionnement hors-ligne

Point de rupture du marché. Beekube, la solution française la plus complète, **n'a pas de mode hors-ligne** — aveu de son propre centre d'aide. HiveBook et Apiarist stockent au contraire les données localement et fonctionnent sans réseau.

**Verdict V1 : confirme l'architecture local-first.** Au rucher, à Dompierre-les-Ormes, c'est non négociable.

### 3.11 Tâches et rappels générés

Beekube génère automatiquement des tâches à partir de l'intervention saisie ; HiveTracks recommande la date de la prochaine visite. C'est probablement la fonctionnalité au meilleur rapport valeur/effort de développement.

Exemple directement applicable à ton cas : introduction d'un cadre de couvain frais → génération automatique d'un contrôle à J+9 (operculation des cellules royales), J+16 (naissance) et J+28 (contrôle de ponte).

**Verdict V1 : must have.**

### 3.12 Intelligence artificielle

Trois usages distincts observés sur le marché, par ordre de maturité :

1. **Lecture automatique des justificatifs** (HiveBook) — photo d'un ticket, catégorisation et montant extraits. Meilleur retour sur effort, aucun risque.
2. **Chat contextuel sur ses propres ruches** (HiveBook, ApiNote) — poser une question à une IA qui connaît l'historique de la colonie.
3. **Briefing quotidien priorisé** (HiveBook) — synthèse des actions à mener.

L'ITSAP situe par ailleurs le potentiel de l'IA en apiculture sur la détection précoce de maladies par analyse d'image et sur l'analyse bioacoustique — hors périmètre d'une V1.

**Verdict V1 :** usages 1 et 2, via l'API Anthropic. L'usage 2 prend toute sa valeur si le contexte transmis inclut, en plus de l'historique de la ruche, tes comptes rendus de formation.

### 3.13 Export et portabilité

CSV, PDF, JSON. BEEP expose une API et permet l'export du jeu de données brut.

**Verdict V1 : non négociable.** C'est ce qui te protège de ton propre outil.

---

## 4. Le volet économique : la vraie lacune du marché

### 4.1 État des lieux

**Côté français : néant.** Beekube, BeePerf et Melys traitent la production et la traçabilité, pas l'argent. Melys gère un stock de fûts et des ventes, mais aucune charge. HiveTracks a reçu en 2025 une demande utilisateur explicite de suivi de rentabilité — restée sans suite.

**Côté international : embryonnaire.** HiveBook, Beeing et BeeKeepPal annoncent un suivi de rentabilité par ruche. Mais tous reposent sur le même mécanisme simple : une écriture est rattachée à *une* ruche, ou à rien. Aucun ne gère la répartition d'une charge sur plusieurs ruches, ni l'amortissement du matériel.

**Conclusion : ton besoin — affecter une dépense soit à l'ensemble de l'activité, soit à une ou plusieurs ruches — n'est couvert par aucune solution du marché.** C'est le différenciant central de ton projet.

### 4.2 Modèle proposé

Une **écriture** unique, dépense ou produit, portant :

| Champ | Contenu |
|---|---|
| Date, libellé, montant | HT / TTC selon régime |
| Sens | Dépense / Produit |
| Catégorie | Cheptel, matériel, intrants sanitaires, nourrissement, conditionnement, déplacement, formation, assurance, cotisations / Vente miel, vente essaims, prestation pollinisation, aides |
| Tiers | Fournisseur ou client |
| Mode de règlement | Espèces, chèque, virement, carte |
| Justificatif | Photo du ticket ou de la facture |
| **Niveau d'affectation** | **Exploitation / Rucher / Ruche(s) sélectionnées** |
| **Clé de répartition** | Égale / au prorata de la production en kg / au prorata du nombre de ruches / manuelle en % |
| Nature comptable | Charge directe / charge indirecte / **investissement amortissable** (avec durée) |
| Origine du produit | Production propre / négoce *(voir 4.4)* |

**Cas d'usage concrets :**

- Cire gaufrée pour 3 ruches, 45 € → affectation Ruches [1,2,3], clé égale → 15 €/ruche
- Extracteur, 400 €, durée 10 ans → investissement amortissable → 40 €/an répartis au prorata du nombre de ruches actives dans l'année
- Traitement varroa sur la ruche 3 uniquement → affectation Ruche [3], charge directe
- Assurance et cotisation syndicale → affectation Exploitation, clé au prorata du nombre de ruches
- Frais de déplacement au rucher → affectation Rucher, clé au prorata du nombre de ruches de ce rucher

### 4.3 Indicateurs à produire

- **Coût de revient au kg de miel, par ruche** — l'indicateur que personne ne calcule
- Marge nette par ruche et par rucher
- Chiffre d'affaires par ruche
- Contribution de chaque ruche au résultat global
- Coût d'une colonie perdue (cumul des charges affectées avant sa perte)
- Seuil de rentabilité de l'exploitation

Une réserve méthodologique à intégrer dès la conception : à trois colonies, ces ratios sont statistiquement fragiles. Ils prennent leur sens sur trois à cinq saisons, ou dès que le cheptel dépasse une dizaine de ruches. L'outil doit afficher l'historique pluriannuel plutôt qu'un chiffre isolé.

### 4.4 Conformité fiscale — à intégrer dès la V1

Deux points relevés sur les sources syndicales (SNA) :

1. **Livre de recettes obligatoire au micro-BA.** Tenu chronologiquement, il doit mentionner le montant et l'origine des recettes (identité du client), le mode de règlement et les références des pièces justificatives. Ton modèle d'écriture ci-dessus couvre déjà ces champs : le livre de recettes devient un simple export.

2. **Distinction micro-BA / BIC.** Les ventes de miel, cire, pollen, propolis, essaims et reines issus de tes propres ruches relèvent du micro-BA, quel que soit le nombre de ruches, tout comme les prestations de pollinisation et les aides perçues. En revanche, la **revente** de miel ou de matériel que tu n'as pas produit relève des BIC. D'où le champ « origine du produit » : sans lui, l'export fiscal sera faux dès la première revente.

C'est un point de vigilance particulier compte tenu de la structure ETHERYS.

---

## 5. Ce qu'il ne faut pas reproduire

- **Les capteurs connectés** (BeeGuard) : coût disproportionné à cette échelle, et l'application y perd son intérêt sans eux
- **L'analyse BLUP et la sélection génétique statistique** : sans signification en dessous d'une vingtaine de colonies
- **La logique « rucher homogène »** de Melys : conçue pour traiter des centaines de ruches par lots, contraire au suivi individuel recherché
- **Les modules communautaires et associatifs** : hors sujet pour un outil personnel
- **Le cloud obligatoire** : Beekube en fait la démonstration involontaire, sans réseau au rucher l'outil est inutilisable
- **La sur-fonctionnalité** : le retour utilisateur récurrent est qu'un débutant n'utilise qu'une fraction des fonctions d'une application riche

---

## 6. Ce que personne ne fait — le périmètre propre de ton outil

1. **Comptabilité analytique par ruche avec clés de répartition** — inexistant sur le marché
2. **Registre d'élevage français et livre de recettes micro-BA générés depuis le même jeu de données**
3. **Module verger mellifère relié aux miellées observées** — le calendrier de floraison de HiveBook s'en approche, mais reste déconnecté du végétal réellement planté et de sa localisation
4. **Traçabilité d'une conduite biologique respectueuse du vivant** — intrants, justificatifs, conformité au cahier des charges
5. **Assistant IA branché sur tes données propres et tes sources de formation** — et non sur une base généraliste

---

## 7. Points à trancher avant la rédaction du cahier des charges

1. **Périmètre de la V1** : le module économique entre-t-il en V1, ou en V2 après une saison de rodage de la saisie terrain ?
2. **Régime fiscal retenu** (micro-BA / réel) : conditionne la structure des écritures et les exports
3. **Photos** : simple pièce jointe à la visite, ou indexation par cadre dès la V1 ?
4. **Périmètre de l'IA** : chat contextuel seul, ou également lecture des justificatifs et analyse d'images de cadres ?
5. **Multi-appareils** : usage sur un seul téléphone, ou synchronisation téléphone ↔ ordinateur nécessaire ? *(Cette réponse détermine l'architecture — le local-first pur devient plus complexe dès qu'il faut synchroniser.)*
6. **Reprise de l'existant** : import du fichier `archives_apicoles.csv` et du carnet Excel dès la V1 ?

---

## Sources principales

- Beekube — beekube.com (site éditeur et centre d'aide) *— source orientée, voir §1*
- BeePerf — beeperf.com, Google Play
- Melys — melys.app, App Store, L'Actu des Apiculteurs
- BeeGuard — beeguard.fr
- BEEP — beep.nl, github.com/beepnl/BEEP, B-GOOD project, EU CAP Network
- HiveBook — hivebook.app, App Store
- Apiarist — App Store
- Beeing — beeing.gr
- BeeKeepPal — beekeeppal.com
- HiveTracks — App Store
- ApiNote — Google Play
- ApiManager — apimanager.net
- Syndicat National d'Apiculture — snapiculture.com (registre d'élevage, fiscalité apicole)
- Légifrance — arrêté du 5 juin 2000 relatif au registre d'élevage
- ITSAP — Institut de l'abeille (IA et apiculture)
- Forums Apiculture-France et Ruches-Apiculture (retours d'usage)
