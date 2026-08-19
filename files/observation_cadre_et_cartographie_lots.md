# Observation cadre par cadre & cartographie des lots
## Enrichissement du cahier des charges — août 2026

---

# Partie A — Modèle d'observation enrichi

## A.1 Principe : deux niveaux, jamais deux saisies

L'observation existe à **deux niveaux** :

| Niveau | Objet | Usage |
|---|---|---|
| **Colonie** | Agrégats : nombre de cadres de couvain, de provisions, population, ponte | Visite de routine — c'est le niveau actuel |
| **Cadre** | Détail par cadre et par face : occupation des surfaces, qualité, état du support, signes sanitaires | Visite approfondie, diagnostic, bilan de saison |

**Règle cardinale : jamais de double saisie.** Si des observations cadre par cadre existent pour une visite, les agrégats de la colonie sont **calculés** à partir d'elles et deviennent non modifiables. Sinon ils sont saisis directement. L'utilisateur ne renseigne jamais la même information deux fois.

**Seconde règle : le niveau cadre est toujours facultatif et partiel.** Une visite reste valide sans aucun cadre détaillé, ou avec un seul cadre renseigné sur dix. Enregistrer dix cadres sur deux faces pour cinq colonies représente cent observations : imposer cette complétude condamnerait l'outil. Le cas d'usage réel est **le cadre remarquable** — celui qui pose question, celui qu'on veut suivre, celui qui porte un signe.

## A.2 Standards retenus

- **COLOSS BEEBOOK, volume I** — méthodes standardisées d'estimation de la force des colonies. La révision 2.0 de 2024 couvre explicitement, au-delà de la population et du couvain, les réserves de miel et de pollen, la qualité du couvain, la construction des rayons et l'expression visible des symptômes de maladies et de parasites. C'est le référentiel le plus complet pour ce que tu veux décrire.
- **Méthode Liebefeld** (Imdorf, station de recherche suisse) — estimation visuelle rapide par **face de rayon**, en rapportant la surface occupée à la surface totale de la face. Le relevé s'effectue face a et face b de chaque cadre. C'est la méthode qui structure le modèle proposé ci-dessous.
- **Fiche de notation BIBBA** — pratique de sélection : notation du couvain, du tempérament, de la propension à l'essaimage, avec moyennes glissantes plutôt que valeur ponctuelle.
- **Pratique de terrain** — notation du couvain sur cinq niveaux, largement partagée par les praticiens : un couvain très compact correspond à 90 % ou plus des cellules operculées dans la zone de ponte, un couvain dispersé signale un problème à investiguer.

## A.3 Le modèle `observation_cadre`

Une ligne par **face** de cadre. Deux faces par cadre.

```
observation_cadre
  visite_id
  position            1 à 12, depuis un bord de référence paramétrable
  face                A | B
  type_cadre          bâti | gaufré neuf | amorce | naturel | partition | nourrisseur
```

### Occupation des surfaces

Estimation en **huitièmes de face** — l'unité la plus rapide sur le terrain, convertible en pourcentage, en cm² puis en nombre de cellules selon le type de ruche.

```
  couvain_opercule        0–8
  couvain_ouvert          0–8      larves visibles
  oeufs                   0–8
  miel_opercule           0–8
  nectar_frais            0–8      miel non operculé
  pollen                  0–8      pain d'abeille
  cellules_vides          0–8
  non_bati                0–8
  couvain_male            0–8
```

Contrôle de cohérence : la somme doit avoisiner 8. L'application signale un écart supérieur à 2 sans bloquer — une estimation reste une estimation.

### Qualité du couvain

```
  score_ponte             1–5
      5  très compact, ≥ 90 % des cellules operculées dans la zone de ponte
      4  compact, quelques cellules vides
      3  correct, cellules vides dispersées
      2  lacunaire, nombreux trous
      1  très dispersé, mosaïque
  homogeneite_stades      oui | non      stades cohérents entre eux
  couvain_male_disperse   oui | non      mâles hors zone périphérique — signe d'anomalie
  couvain_bombe           oui | non      opercules bombés — couvain de mâles en cellules d'ouvrières
```

### Réserves

```
  miel_qualite            frais | mûr | cristallisé | fermenté
  pollen_diversite        1–5          nombre de couleurs distinctes observées
  pollen_ancien           oui | non    pollen compacté, non consommé
```

La diversité du pollen est un indicateur nutritionnel direct de l'environnement mellifère — donnée qui prendra tout son sens quand le module verger sera relié.

### État du cadre lui-même

```
  annee_cire              année de mise en service
  etat_bati               1–5
  a_reformer              oui | non
  motif_reforme           cire noire | déformé | cassé | couvain de mâles excessif | sanitaire
  fil_apparent            oui | non
  ponts_de_cire           oui | non
  moisissure              oui | non
```

L'année de la cire est la donnée la plus souvent perdue et la plus utile : elle pilote la rotation des cadres, pratique centrale en conduite biologique — le renouvellement d'environ un tiers des cadres par an est la recommandation courante pour limiter l'accumulation de résidus et de spores.

### Cellules royales

```
  cellules_royales_nb     0–n
  cellules_royales_type   essaimage | supersédure | sauveté
  cellules_royales_pos    bord inférieur | bord latéral | pleine surface
  cellules_operculees     oui | non
```

La **position** détermine l'interprétation : en bord de cadre, elle oriente vers l'essaimage ; en pleine surface, vers la supersédure ou la sauveté. C'est une information que la saisie au niveau colonie perd entièrement.

### Signes sanitaires observés sur ce cadre

```
  signes                  multi-sélection, voir §A.5
  test_allumette          non réalisé | négatif | positif
  photo_id                si photo indexée sur ce cadre
```

## A.4 Pourquoi les huitièmes plutôt que les pourcentages

La méthode Liebefeld raisonne en proportion de surface de face. Sur le terrain, personne n'estime au pourcentage près. Le huitième correspond à un découpage mental naturel de la face d'un cadre — moitié, quart, huitième — et se saisit en un appui sur une échelle de neuf boutons.

La conversion vers les unités scientifiques reste possible en aval : le BEEBOOK indique que le passage des cm² au nombre de cellules s'effectue par un facteur de densité cellulaire, à établir localement, les valeurs usuelles s'échelonnant d'environ 3,7 à 4,7 cellules par cm². À stocker comme paramètre par type de ruche, jamais à demander à la saisie.

## A.5 Taxonomie sanitaire

### Signes observables par cadre

| Signe | Ce qu'il évoque |
|---|---|
| Couvain en mosaïque | Non spécifique — varroose, loques, couvain sacciforme, défaillance de reine |
| Opercules affaissés, percés, rongés | Loque américaine, varroose |
| Larves brunes visqueuses adhérentes | Loque américaine |
| Larves flasques jaune clair, positions aberrantes, tête non visible | Loque européenne |
| Larves en sac, écailles noires non adhérentes | Couvain sacciforme |
| Momies blanches à gris foncé, aspect duveteux | Ascosphérose — couvain plâtré |
| Odeur de colle, putride, soufrée | Loque américaine à stade avancé |
| Odeur aigre | Loque européenne |
| Ailes déformées sur abeilles émergentes | Varroose et virus associés |
| Varroas visibles sur nymphes ou adultes | Varroose |
| Toiles, galeries, cocons | Fausse teigne |
| Coléoptère noir, larves dans les rayons | *Aethina tumida* |

### Diagnostic différentiel des maladies du couvain

| | Couvain touché | Consistance | Test de l'allumette | Odeur |
|---|---|---|---|---|
| **Loque américaine** | Operculé | Visqueuse, **adhérente** | **Positif** — filament élastique de plus de 1,5 à 2 cm, larve non extractible | Colle forte, putride |
| **Loque européenne** | Ouvert | Pâteuse, semi-liquide, **non adhérente** | Négatif — masse non filante | Aigre |
| **Couvain sacciforme** | Operculé | Larve en sac, écailles **non adhérentes** | Négatif | Absente |
| **Ascosphérose** | Fermé | Momie compacte duveteuse | Sans objet | Absente |

Ces affections peuvent coexister dans une même colonie, en particulier couvain sacciforme et loque européenne.

### Dangers sanitaires réglementés

Quatre dangers sont classés en première catégorie : **loque américaine, *Aethina tumida*, *Tropilaelaps*, nosémose à *Nosema apis***. Aucun traitement n'existe contre eux et l'usage d'antibiotiques est interdit.

**Comportement imposé à l'application.** Cocher un signe de danger de catégorie 1 déclenche un parcours dédié, non contournable :

1. Affichage immédiat de la conduite à tenir : ne pas déplacer la ruche, ne réutiliser aucun cadre ni élément, isoler.
2. Rappel de l'obligation de déclaration à la DDecPP et de la mise en relation avec un vétérinaire, un TSA ou le GDSA.
3. Mention du prélèvement attendu — un morceau de couvain d'environ 10 × 10 cm pour analyse de confirmation.
4. Génération automatique d'une entrée dans le registre d'élevage et d'une tâche urgente.
5. Aucun conseil de traitement produit par l'application ni par l'IA. Le diagnostic de certitude relève du laboratoire.

## A.6 Règles dérivées

**R-COUV-01 — Le piège du diagnostic de reine.** Un score de ponte inférieur à 3 déclenche en priorité une recommandation de **comptage varroa**, pas de remérage. La cause la plus fréquemment mal diagnostiquée d'un couvain lacunaire est la pression varroa et les virus associés : les abeilles retirent le couvain atteint, ce qui produit exactement l'aspect d'une reine défaillante. Remérer une colonie chargée en varroas ne change rien.

**R-COUV-02 — Un cadre n'est pas la colonie.** Un cadre lacunaire isolé au milieu d'un nid compact n'est pas un signal. La règle ne se déclenche que si le score moyen pondéré par la surface de couvain reste bas sur l'ensemble des cadres.

**R-COUV-03 — Fenêtre d'observation.** Une reine remérée récemment produit un couvain irrégulier normal. Aucune recommandation de remérage avant deux cycles complets de couvain, soit environ quarante jours.

**R-CIRE-01 — Rotation des cadres.** Un cadre dont la cire dépasse trois ans est proposé à la réforme lors du bilan d'automne. Objectif de rotation : environ un tiers du parc de cadres par an.

**R-CRO-01 — Interprétation des cellules royales.** Cellules en bord inférieur et couvain abondant orientent vers l'essaimage, avec contrôle sous sept jours. Cellules en pleine surface avec reine présente orientent vers la supersédure : ne pas détruire.

## A.7 Ergonomie de la saisie cadre par cadre

C'est le point critique. Une saisie détaillée mal conçue ne sera jamais utilisée.

**Trois modes d'entrée, au choix à l'ouverture :**

| Mode | Usage | Durée cible |
|---|---|---|
| **Cadre remarquable** | Un seul cadre, celui qui pose question | 15 secondes |
| **Zone de couvain** | Uniquement les cadres portant du couvain | 1 minute |
| **Cadre par cadre complet** | Bilan de saison, diagnostic, expertise | 3 à 5 minutes |

**Principes de l'écran :**

- Une réglette de neuf boutons pour l'occupation en huitièmes — un appui par valeur, aucun clavier.
- Un seul écran par face, navigation par balayage entre faces et cadres.
- Report automatique de la face A vers la face B comme valeur de départ, modifiable.
- Les champs sanitaires et l'état du cadre sont repliés par défaut : ils ne s'ouvrent qu'à la demande.
- Une représentation graphique du cadre, remplie en direct, sert de contrôle visuel immédiat.
- Sortie possible à tout moment. Les cadres non renseignés restent vides, jamais nuls.
- En mode dictée : « cadre 4, moitié couvain operculé, un quart miel, ponte compacte » — le lexique de conversion (moitié, quart, huitième, tiers) est intégré au glossaire.

## A.8 Impact sur le modèle existant

- Ajout de la table `observation_cadre`.
- Les champs agrégés de `visite` reçoivent un indicateur `source` : `saisie_directe` ou `calcule_depuis_cadres`.
- Le champ `anomalies` de `visite` devient la remontée agrégée des signes observés par cadre, complétée des observations de niveau colonie (pillage, tempérament, activité au trou de vol).
- La table `photo` reçoit `observation_cadre_id`, ce qui réalise la piste « photos indexées par cadre » déjà notée en réserve.

---

# Partie B — Cartographie complète des fonctionnalités par lot

Priorités : **M** must · **S** should · **C** could. Le symbole ⚑ signale les éléments issus de la réserve d'idées, jamais encore arbitrés.

## L1 — Socle terrain *(spécifié, prêt à coder)*

| Réf | Fonctionnalité | Prio |
|---|---|---|
| L1.1 | Référentiel ruchers / ruches / colonies / reines | M |
| L1.2 | Séparation stricte ruche / colonie, succession des colonies | M |
| L1.3 | Vue d'ensemble du rucher, ordre de tournée réordonnable | M |
| L1.4 | Quatre niveaux d'état, bloc « à faire en premier » | M |
| L1.5 | Saisie manuelle d'une visite, sans clavier | M |
| L1.6 | Saisie différentielle, pré-remplissage depuis la visite précédente | M |
| L1.7 | Bouton « rien à signaler » | M |
| L1.8 | Provenance des champs (saisi / reporté / vide) | M |
| L1.9 | Anomalies jamais reportées d'une visite à l'autre | M |
| L1.10 | Historique d'une colonie avec écarts entre visites | M |
| L1.11 | Import du CSV existant | M |
| L1.12 | Export et restauration JSON hors-ligne | M |
| L1.13 | PWA installable, fonctionnement en mode avion | M |
| L1.14 | Suppression logique, corbeille | M |
| L1.15 | **Score de ponte 1–5 au niveau colonie** (enregistré, sans automatisme) | M |
| L1.16 | **Taxonomie des signes sanitaires, liste fermée** | M |
| L1.17 | **Parcours danger sanitaire de catégorie 1** (contenu réglementaire statique) | M |
| L1.18 | **Table `observation_cadre` au schéma, sans interface** | M |
| L1.19 | Champ `source_agregats` sur la visite, valeur unique en L1 | M |
| L1.20 | **Cellules royales au niveau visite** (nombre, type : essaimage / supersédure / sauveté) — déjà dans le modèle V1 §4.2, jamais construit ni assigné avant le 11/08/2026 | M |
| L1.21 | **Tempérament (1–5)** au niveau visite — idem | M |
| L1.22 | **Bâtisse (1–5)** au niveau visite — idem | M |

## L2 — Synchronisation, dictée, photos et observation cadre par cadre

| Réf | Fonctionnalité | Prio |
|---|---|---|
| L2.1 | Backend managé, synchronisation téléphone ↔ ordinateur | M |
| L2.2 | File d'attente locale, résolution dernière écriture gagnante | M |
| L2.3 | Enregistrement audio local, transcription différée | M |
| L2.4 | Mode tournée vocale, découpage par colonie | M |
| L2.5 | Glossaire métier de correction phonétique | M |
| L2.6 | Structuration IA de la dictée vers les champs | M |
| L2.7 | Écran de revue de tournée | M |
| L2.8 | Conservation de l'audio rattaché à la visite | S |
| L2.9 | Photos en pièce jointe, compression, stockage | M |
| L2.10 | Signalement des colonies absentes de la dictée | M |
| L2.11 | ⚑ Dictée généralisée à tous les écrans de saisie | C |
| L2.12 | ⚑ Identification de ruche par QR code ou NFC | S |
| L2.13 | Écran de saisie cadre par cadre, une face à la fois | M |
| L2.14 | Occupation des surfaces en huitièmes, réglette de neuf boutons | M |
| L2.15 | Trois modes : cadre remarquable / zone de couvain / complet | M |
| L2.16 | Agrégation automatique des cadres vers les compteurs de la colonie | M |
| L2.17 | Bascule `source_agregats` vers `calcule_depuis_cadres` | M |
| L2.18 | Cellules royales : nombre, type, position | M |
| L2.19 | Signes sanitaires par cadre, reprise de la taxonomie L1 | M |
| L2.20 | Test de l'allumette, saisie du résultat | S |
| L2.21 | Report de la face A vers la face B comme valeur de départ | S |
| L2.22 | Représentation graphique du cadre, remplie en direct | S |
| L2.23 | État du cadre : année de cire, réforme, motif | S |
| L2.24 | Qualité du miel, diversité du pollen | S |
| L2.25 | Photos indexées par cadre | S |
| L2.26 | Lexique de conversion pour la dictée (moitié, quart, huitième) | S |
| L2.27 | Conversion huitièmes → cm² → cellules, paramétrable | C |
| L2.28 | Comparaison d'un même cadre entre deux visites | C |

**L2 est devenu le lot le plus lourd de la trajectoire.** Séquencement interne recommandé, avec validation après chaque étape : synchronisation → photos → dictée et transcription → écran de revue → écran cadre par cadre → agrégation. Ne pas ouvrir l'étape suivante avant que la précédente ait servi au rucher.

**Synchronisation livrée le 12/08/2026** (jumelage par appareil, file d'attente locale, résolution dernière écriture gagnante). **Reste de L2 livré le 13/08/2026** (photos, tournée vocale, transcription embarquée gratuite, structuration IA via fonction Edge Supabase, revue de tournée, cadre par cadre M13, agrégation §6.4). Vérifié techniquement de bout en bout, y compris rejeu d'une dictée réelle prise au rucher (glossaire phonétique et modèle whisper-small ajustés suite à un premier essai jugé trop imprécis). Confirmation en usage réel prolongé au rucher à faire par l'exploitant — reportée à plus tard à sa demande, sans bloquer l'ouverture de L3.

## L2.2 — Sanitaire *(livré 12/08/2026)*

Lot inséré le 12/08/2026 entre L2 et L3 — voir `brief_L2.2_sanitaire.md` pour le détail complet. Contenu transposé depuis L3/L3bis/L4 (numérotation d'origine indiquée entre parenthèses) :

| Réf | Fonctionnalité | Prio |
|---|---|---|
| L2.2.1 | Traitements : produit, AMM, lot, dosage, délai d'attente (ex-L3.1) | M |
| L2.2.2 | `date_fin_delai_attente` calculée et stockée — le blocage de récolte lui-même reste hors lot, M4 n'existe pas encore (ex-L3.2, partiel) | M |
| L2.2.3 | Comptages varroa, varroas/jour, seuils saisonniers paramétrables (ex-L3.3) | M |
| L2.2.4 | Marquage de conformité au cahier des charges bio (ex-L3.4) | M |
| L2.2.5 | Nourrissement : type, quantité, composition, origine (ex-L3.5) | M |
| L2.2.6 | Documents rattachés à un traitement : ordonnances, comptes rendus (ex-L3.10, périmètre traitement uniquement) | M |
| L2.2.7 | Rappels automatiques, trois règles fixes déjà écrites en §6.3 (traitement → délai, varroa fort, varroa modéré) — ex-L3b.6, partiel : seules les règles à seuil fixe, pas les règles météo-dépendantes | M |
| L2.2.8 | Export PDF ciblé aux deux blocs sanitaires du registre — « encadrement sanitaire » et « interventions vétérinaires » (ex-L4.1, partiel : 2 des 5 blocs, pas de pagination continue multi-blocs ni d'annexe documentaire) | M |

**Explicitement exclu, y compris sous l'instruction de transposition :** le moteur de règles météo (L3b.4-L3b.5, R-COUV-01 et le reste du catalogue) reste intégralement en L3bis — ce n'est pas un rappel fixe mais une heuristique de conduite, hors du carnet de bord à tout lot.

## L3 — Récoltes, mouvements, tâches (sanitaire transposé en L2.2)

| Réf | Fonctionnalité | Prio |
|---|---|---|
| L3.2 | Blocage de récolte pendant le délai d'attente (utilise `date_fin_delai_attente`, calculée dès L2.2) | M |
| L3.6 | Mouvements de ruches et de colonies | M |
| L3.7 | Récoltes, six modes de saisie, poids net calculé | M |
| L3.8 | Rendement par colonie, par ruche, par saison | M |
| L3.9 | Tâches manuelles, vue consolidée | M |

L3.1, L3.3, L3.4, L3.5 et L3.10 sont passés en L2.2 (arbitrage du 12/08/2026, voir ci-dessus) — numérotation d'origine conservée à titre d'historique, non réutilisée.

## L3bis — Météo et moteur de recommandations *(brief rédigé le 18/08/2026)*

> Spécifié dans **`brief_L3bis_moteur_regles.md`**, qui prime sur l'addendum M12 partout où
> les deux divergent — M12 date du 10/08 et est antérieur à L2.2, L3 et aux arbitrages des
> 14 au 16/08. Arbitrages d'ouverture : cahier des charges §21.

| Réf | Fonctionnalité | Prio |
|---|---|---|
| L3b.1 | Reconstitution de l'historique météo par API d'archive — Open-Meteo, déjà le fournisseur du module M8, remonte à 1940 : contrairement à l'avertissement de M12 §9, aucune donnée passée n'est perdue | M |
| L3b.2 | Rafraîchissement quotidien, cache local | M |
| L3b.3 | Agrégats : canicule, sécheresse, pluie prolongée, gel tardif | M |
| L3b.4 | Moteur de règles déterministe, versionné | M |
| L3b.5 | Catalogue de **huit règles nouvelles**, et non quinze — six des quinze de M12 sont déjà livrées, une est écartée (R-ORPH-01) et une reportée en L5 (R-REGL-01). Détail au §2.2 du brief | M |
| L3b.6 | Génération de tâches — **deux régimes coexistent** (§21) : les quatorze règles livrées, déclenchées par un fait saisi, créent une tâche directement ; les règles du moteur, déclenchées par une inférence, émettent une proposition à valider | M |
| L3b.7 | Cycle de vie : proposée / validée / différée / rejetée — **pour les règles du moteur uniquement** | M |
| L3b.8 | Traçabilité complète du déclenchement | M |
| L3b.9 | Paramétrage des seuils par règle | M |
| L3b.10 | Plafond de deux urgences par rucher | M |
| L3b.11 | Effet observé rattaché à la visite suivante | S |
| L3b.12 | Fenêtre météo favorable à une visite | S |

## L4 — Économique *(anciennement L5)*

> **Inversion actée le 18/08/2026** (cahier des charges §21) : l'économique passe devant le
> registre. Les références `L5.x` ci-dessous sont **conservées telles quelles** — même
> convention que pour L3 plus haut : la numérotation d'origine reste un identifiant stable
> et ne suit pas le renommage du lot.

| Réf | Fonctionnalité | Prio |
|---|---|---|
| L5.1 | Écritures dépenses et produits, champs complets | M |
| L5.2 | Affectation exploitation / rucher / ruches sélectionnées | M |
| L5.3 | Quatre clés de répartition | M |
| L5.4 | Recalcul dynamique des clés dépendant de la production | M |
| L5.5 | Justificatifs photographiés | M |
| L5.6 | Immobilisations et dotations annuelles | M |
| L5.7 | Coût de revient au kg par ruche | M |
| L5.8 | Marge, contribution, seuil de rentabilité | M |
| L5.9 | Comparaison pluriannuelle | S |
| L5.10 | Coût cumulé d'une colonie perdue | S |
| L5.11 | Extraction IA des justificatifs | C |
| L5.12 | Champs fiscaux captés, exports désactivés | M |

## L5 — Registre d'élevage *(anciennement L4)*

> **Inversion actée le 18/08/2026** (cahier des charges §21). Références `L4.x` conservées,
> même convention que ci-dessus.

| Réf | Fonctionnalité | Prio |
|---|---|---|
| L4.1 | Export PDF paginé, cinq blocs réglementaires — réutilise la génération PDF de L2.2 pour les blocs « encadrement sanitaire » et « interventions vétérinaires », construit les trois blocs restants (fiche synthétique, mouvements des animaux, entretien et soins) et l'assemblage paginé complet | M |
| L4.2 | Classement chronologique par type de données | M |
| L4.3 | Sélection de période | M |
| L4.4 | Annexe des documents rattachés | M |
| L4.5 | Rappel trimestriel d'impression — **la règle R-REGL-01 du moteur M12 y est rattachée**, reportée de L3bis faute de registre à imprimer avant ce lot (§21) | S |
| L4.6 | Conservation cinq ans, aucune purge | M |

## L6 — Assistant IA et finitions

| Réf | Fonctionnalité | Prio |
|---|---|---|
| L6.1 | Chat contextuel sur les données d'une colonie | M |
| L6.2 | Injection des comptes rendus de formation dans le contexte | S |
| L6.3 | Arbitrage IA des règles concurrentes | S |
| L6.4 | Piste IA hors règle, signalée comme non validée | S |
| L6.5 | Synthèse de début de saison | C |
| L6.6 | ⚑ Tableaux de bord personnalisables | C |
| L6.7 | ⚑ Graphiques exportables en image | C |
| L6.8 | ⚑ Conformité WCAG 2.1 | C |
| L6.9 | ⚑ API ouverte | C |

## V2 — Hors trajectoire actuelle

Module verger mellifère · exports fiscaux micro-BA · analyse d'image IA du couvain · élevage de reines · ⚑ fil d'actualités apicoles · ⚑ chatbot de support.

---

## Arbitrages actés — 11 août 2026

| Question | Décision |
|---|---|
| Placement de l'observation cadre par cadre | **Fusionnée dans L2**, plus de lot L2bis |
| Table `observation_cadre` | **Au schéma dès L1**, sans aucune interface |
| Score de ponte au niveau colonie | **En L1**, enregistré sans automatisme |
| Parcours danger sanitaire de catégorie 1 | **En L1**, contenu réglementaire statique |

### Frontière posée pour L1

L1 peut contenir du **contenu réglementaire statique** — le parcours danger sanitaire en est l'unique cas, justifié par une obligation de déclaration qui ne se discute pas. L1 ne contient **aucune heuristique de conduite** : le score de ponte est enregistré et ne déclenche rien, la règle R-COUV-01 qui le relie au comptage varroa appartient au moteur du lot L3bis.

### Dépendances différées du parcours sanitaire

L'entrée automatique au registre d'élevage (L4) et la génération automatisée de tâches (L3bis) n'existent pas en L1. Le parcours y crée une tâche d'origine manuelle et marque la visite. Les données saisies alimenteront rétroactivement les deux modules — aucune ressaisie.

---

## Arbitrages actés — 12 août 2026

| Question | Décision |
|---|---|
| Création d'un lot sanitaire dédié | **Nouveau lot L2.2**, inséré entre L2 (synchronisation, livrée) et L3 |
| Contenu transposé vers L2.2 | Ex-L3.1, L3.3, L3.4, L3.5, L3.10 (traitements, comptages varroa, nourrissement, conformité bio, documents rattachés) ; ex-L3b.6 partiel (les trois règles de rappel à seuil fixe) ; ex-L4.1 partiel (export PDF des deux blocs sanitaires) |
| Moteur de règles météo (L3b.4-L3b.5) | **Reste exclu de L2.2**, sans exception — confirmé explicitement malgré l'instruction de transposition : ce n'est pas un rappel fixe mais une heuristique de conduite |

Détail complet du lot : `brief_L2.2_sanitaire.md`.
