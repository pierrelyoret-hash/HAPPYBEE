# Addendum au cahier des charges V1
## Module M12 — Conduite assistée : moteur de recommandations

**Version** 1.0 — août 2026
**Complète** le cahier des charges fonctionnel V1 (remplace et étend le module M9)

---

## 1. Contrôle de cohérence préalable

L'exemple fourni — canicule et sécheresse déclenchant une recommandation de nourrissement au sirop 70/30 pour constituer des réserves — est pertinent dans son principe. Il présente cependant trois écarts avec les sources d'apiculture biologique, qui doivent être corrigés avant d'être codés en règle.

### 1.1 En bio, la finalité du nourrissement n'est pas libre

Le règlement UE 2018/848 n'autorise le nourrissement **que lorsque la survie des colonies est menacée en raison des conditions climatiques**, au moyen de miel, sucre, sirop de sucre et pollen **biologiques**. Cette restriction ne s'applique pas aux essaims en cours de développement. Un règlement délégué de 2020 (UE 2020/2146) étend la possibilité à des événements non climatiques — incendie, séisme — sous dérogation.

La formulation « pour permettre que la ruche fasse des réserves » glisse vers une logique de production, qui n'est pas le motif admis. La règle doit s'énoncer comme un **nourrissement de sauvegarde justifié par un aléa climatique**, motif que la canicule et la sécheresse satisfont pleinement. La nuance n'est pas rhétorique : elle conditionne l'acceptabilité en cas de contrôle, et l'application doit consigner la justification climatique à chaque nourrissement.

Corollaire réglementaire souvent oublié : le même texte impose de **laisser dans les ruches des réserves de miel et de pollen suffisantes pour l'hivernage** au terme de la saison de production. En période de disette, la première recommandation n'est donc pas de nourrir, mais de **ne pas récolter**.

### 1.2 Le choix du sirop dépend de l'objectif, pas de la seule saison

Le sirop 50/50 est un sirop de stimulation : il simule une miellée et relance la ponte. Un sirop nettement plus concentré sert à la constitution des réserves. Les deux répondent à des situations distinctes, et une disette estivale peut appeler les deux successivement — sirop léger pour soutenir une ponte que la reine a réduite faute de rentrées, sirop concentré ensuite pour reconstituer les réserves.

La règle ne doit donc pas prescrire un ratio fixe : elle doit **demander de qualifier l'objectif**, puis proposer le sirop correspondant.

### 1.3 La météo seule ne peut pas déclencher un nourrissement

C'est l'écart le plus important. Canicule et date ne disent rien de l'état de la colonie. Déclencher un nourrissement sur ce seul croisement conduira à nourrir une colonie disposant déjà de quinze kilos de réserves — geste inutile, coûteux, et qui déclenche précisément le risque décrit ci-dessous.

La règle doit donc croiser trois familles de conditions : **agrégat météo + fenêtre saisonnière + état de provisions constaté**. En l'absence d'observation récente des provisions, la recommandation ne doit pas être « nourrir » mais **« aller vérifier les provisions »** — une recommandation en deux temps.

### 1.4 Garde-fou impératif : le pillage

En période de canicule et de sécheresse, le pillage devient nettement plus fréquent : le nectar se raréfie, les colonies fortes s'attaquent aux plus faibles, et un nourrissement mal conduit en est un déclencheur direct. Les sources s'accordent sur la précaution élémentaire : **ne nourrir qu'en fin de journée**.

Toute recommandation de nourrissement émise par le moteur doit donc s'accompagner de garde-fous affichés, non dissociables de la recommandation elle-même. Ce point est traité en §5.

---

## 2. Architecture du moteur — décision structurante

### 2.1 Deux couches, pas une

| Couche | Rôle | Déterministe | Réseau requis |
|---|---|---|---|
| **Moteur de règles** | Détecte, déclenche, formule la recommandation, porte les garde-fous | Oui | Non |
| **Assistant IA** | Contextualise, arbitre les conflits, traite les cas non couverts, synthétise l'historique | Non | Oui |

**L'IA ne décide jamais seule.** Justification :

- **Reproductibilité.** Une même situation doit produire la même recommandation. Un modèle de langage seul ne le garantit pas.
- **Auditabilité.** En conduite bio, il faut pouvoir répondre à « pourquoi as-tu nourri le 14 août ? ». Une règle versionnée répond ; une génération de texte non.
- **Fonctionnement hors-ligne.** Au rucher, sans réseau, le moteur de règles fonctionne. L'IA non.
- **Risque de dosage.** Un modèle peut produire un dosage plausible et faux. Les quantités et concentrations sont figées dans les règles, jamais générées.

**Ce que l'IA apporte réellement :**

1. Arbitrer quand plusieurs règles se déclenchent et se contredisent — nourrir *et* traiter *et* ne pas ouvrir par 35 °C.
2. Reformuler la recommandation en tenant compte de l'historique propre de la colonie.
3. Proposer une piste quand aucune règle ne couvre la situation observée, explicitement signalée comme non validée par une règle.
4. Produire une synthèse de début de saison ou de tournée.

### 2.2 Cycle de vie d'une recommandation

```
   ÉVÉNEMENT (observation | météo | calendrier | mesure | absence)
        │
        ▼
   MOTEUR DE RÈGLES  ──── aucune règle ────►  IA (piste, signalée comme telle)
        │
        ▼
   RECOMMANDATION  (énoncé + justification + sources + garde-fous)
        │
   ┌────┼────────────┬──────────────┐
   ▼    ▼            ▼              ▼
 VALIDÉE  DIFFÉRÉE  REJETÉE      IGNORÉE
   │       (+ date)  (+ motif)
   ▼
 TÂCHE PLANIFIÉE  →  RÉALISÉE  →  EFFET OBSERVÉ (visite suivante)
                                        │
                                        ▼
                              retour d'expérience :
                              ajustement des seuils
```

Le rejet motivé est aussi précieux que la validation : il alimente le réglage des seuils et le contexte transmis à l'IA.

---

## 3. Extensions du modèle de données

**`regle`**
`code`, `libelle`, `version`, `famille` (sanitaire, nourrissement, essaimage, récolte, hivernage, orphelinage, climat), `declencheurs` (JSON), `conditions` (JSON), `fenetre_saisonniere`, `enonce_modele`, `justification`, `sources` (texte), `garde_fous` (JSON), `urgence` (1–3), `actions_proposees` (JSON), `active` (bool), `parametres_utilisateur` (JSON)

**`evenement`**
`type` (observation_visite, agregat_meteo, calendrier, mesure, absence_visite), `date`, `colonie_id`, `rucher_id`, `source` (visite_id, import météo, planificateur), `donnees` (JSON)

**`recommandation`**
`regle_id`, `regle_version`, `evenement_id`, `colonie_id`, `date_emission`, `enonce`, `justification`, `sources`, `garde_fous`, `urgence`, `origine` (regle / ia), `statut` (proposée, validée, différée, rejetée, ignorée), `motif_rejet`, `differee_au`, `tache_id`, `traitee_le`

**`observation_effet`**
`recommandation_id`, `visite_id`, `effet` (favorable, sans effet, défavorable), `commentaire`

**`meteo_journaliere`** — indispensable, voir §4.2
`rucher_id`, `date`, `t_min`, `t_max`, `precipitations_mm`, `vent_moyen`, `humidite`, `source`, `type` (observé / prévu)

---

## 4. Familles de déclencheurs

### 4.1 Observation de visite

Le plus simple : un champ de la fiche visite prend une valeur qui déclenche une règle. Bourdonneuse, cellules royales, ponte lacunaire, provisions faibles, tempérament dégradé, mortalité anormale.

### 4.2 Agrégat météo — nécessite une ingestion continue

**Point non anticipé dans la V1 initiale.** Une prévision à 16 jours ne suffit pas : « sécheresse » se calcule sur un cumul de pluie passé, « canicule » sur un nombre de jours consécutifs déjà écoulés. L'application doit donc **enregistrer chaque jour la météo observée de chaque rucher** dans `meteo_journaliere`, et conserver cet historique.

Sans cette ingestion quotidienne, aucune règle climatique n'est calculable. C'est une tâche de fond, silencieuse, à prévoir dès la mise en service — les données passées ne se rattrapent pas.

Agrégats à calculer :

| Indicateur | Définition par défaut, paramétrable |
|---|---|
| Épisode caniculaire | ≥ 3 jours consécutifs avec T max ≥ 32 °C |
| Sécheresse | cumul de précipitations < 20 mm sur 30 jours glissants |
| Pluie prolongée | ≥ 5 jours consécutifs avec précipitations, empêchant le butinage |
| Gel tardif | T min < 0 °C après le 1er avril |
| Fenêtre de visite favorable | T max entre 15 et 28 °C, vent < 20 km/h, pas de pluie |

Ces seuils sont à caler sur ton contexte : 450 m d'altitude en Haut-Mâconnais, où les températures décrochent de plusieurs degrés par rapport à la plaine mâconnaise. Les valeurs par défaut sont un point de départ à réviser après une saison.

### 4.3 Calendrier et phénologie

Dates clés de la conduite annuelle, floraisons attendues, échéances réglementaires (déclaration annuelle de ruches, impression trimestrielle du registre).

### 4.4 Mesures

Comptages varroa, provisions estimées, poids, rendement comparé aux saisons précédentes.

### 4.5 Absence

Aucune visite depuis N jours en saison. Aucune ponte constatée depuis N jours sur une colonie signalée orpheline.

### 4.6 Croisements

C'est la valeur ajoutée du moteur, et le cas de ton exemple. Une règle peut exiger la conjonction d'un agrégat météo, d'une fenêtre saisonnière et d'un état de colonie.

---

## 5. Règle de référence — rédaction corrigée

```yaml
code: R-NOUR-01
libelle: Disette estivale par stress climatique
famille: nourrissement
version: 1
urgence: 2

fenetre_saisonniere: 01-07 → 15-09

declencheurs:
  - type: agregat_meteo
    indicateur: episode_caniculaire
  - type: agregat_meteo
    indicateur: secheresse

conditions:            # toutes requises
  - episode_caniculaire sur les 10 derniers jours
  - secheresse active
  - aucune miellée en cours déclarée sur le rucher
  - aucune récolte prévue dans les 15 jours

conditions_etat_colonie:
  si provisions observées il y a moins de 10 jours:
      → declencher si nb_cadres_provisions ≤ 3
  sinon:
      → emettre la recommandation de niveau 1 (vérification)

enonce_niveau_1: >
  Épisode de canicule et de sécheresse en cours. Les provisions de
  {colonie} n'ont pas été observées depuis {n} jours. Contrôler l'état
  des réserves avant toute décision.

enonce_niveau_2: >
  Provisions faibles ({n} cadres) constatées sous stress climatique.
  Un nourrissement de sauvegarde peut se justifier.
  Qualifier l'objectif avant d'agir :
    · soutenir la ponte que la reine a réduite → sirop de stimulation 50/50
    · reconstituer les réserves d'hivernage → sirop concentré

garde_fous:
  - Nourrir en fin de journée uniquement — le risque de pillage est élevé en disette
  - Nourrir toutes les colonies du rucher simultanément, jamais une seule
  - Réduire les entrées des colonies faibles
  - Ne renverser aucun sirop au rucher
  - Vérifier d'abord l'accès à l'eau : en canicule, l'abreuvement précède souvent le nourrissement
  - Sucre ou sirop certifié biologique obligatoire — conserver la facture
  - Consigner la justification climatique : c'est la condition d'admissibilité en AB
  - Aucune hausse posée ni récolte pendant et après le nourrissement
  - Vérifier qu'aucun traitement en cours n'impose un délai d'attente

actions_proposees:
  - libelle: Contrôle des provisions
    echeance: J+2
    priorite: moyenne
  - libelle: Nourrissement de sauvegarde
    echeance: à qualifier
    priorite: moyenne
    saisie_associee: nourrissement
  - libelle: Vérifier l'abreuvement du rucher
    echeance: J+1
    priorite: haute

sources:
  - Règlement UE 2018/848, annexe II — nourrissement admis lorsque la survie
    est menacée par les conditions climatiques, au moyen de produits bio
  - Règlement délégué UE 2020/2146 — règles de production exceptionnelles
  - ITSAP — apiculture biologique, point réglementaire
  - Aide-mémoire apicole suisse — nourrir le soir pour limiter le pillage
```

---

## 6. Catalogue de règles initial

Une douzaine de règles suffit à couvrir la conduite courante. À enrichir au fil des saisons.

| Code | Déclencheur | Recommandation |
|---|---|---|
| R-NOUR-01 | Canicule + sécheresse + provisions faibles | Nourrissement de sauvegarde (§5) |
| R-NOUR-02 | Provisions < seuil à l'entrée de l'hivernage | Compléter les réserves avant le 15 septembre |
| R-ORPH-01 | Bourdonneuse ou absence de ponte confirmée | Introduire un cadre de couvain frais (œufs et larves de moins de 4–5 jours) depuis une colonie saine |
| R-ORPH-02 | Cadre de couvain introduit | Contrôles à J+9, J+16, J+28 |
| R-ESSA-01 | Cellules royales d'essaimage | Contrôle sous 7 jours, envisager la division |
| R-ESSA-02 | Colonie forte + hausse pleine en pleine miellée | Poser une hausse |
| R-VARR-01 | Comptage en niveau fort | Intervenir sous 48 h, recompter à J+21 |
| R-VARR-02 | Comptage en niveau modéré | Recompter à J+14 |
| R-VARR-03 | Aucun comptage depuis 45 jours en saison | Réaliser un comptage |
| R-SANI-01 | Traitement en cours | Interdiction de récolte jusqu'à fin du délai d'attente |
| R-CLIM-01 | Canicule annoncée | Vérifier ombrage, ventilation et abreuvement |
| R-CLIM-02 | Fenêtre météo favorable + visite en retard | Créneau de visite proposé |
| R-VISI-01 | Aucune visite depuis 21 jours en saison | Contrôle de routine |
| R-REGL-01 | Trimestre échu | Imprimer et archiver le registre |
| R-REGL-02 | Période de déclaration annuelle ouverte | Déclarer les ruches |

---

## 7. Exigences fonctionnelles

| Réf | Exigence | Prio |
|---|---|---|
| F12.1 | Évaluer les règles à chaque enregistrement de visite, à chaque import météo quotidien, et une fois par jour au réveil de l'application | M |
| F12.2 | Afficher les recommandations en attente sur l'écran d'accueil, triées par urgence | M |
| F12.3 | Chaque recommandation présente : énoncé, justification, données ayant déclenché la règle, garde-fous, sources | M |
| F12.4 | Valider, différer avec date, ou rejeter avec motif | M |
| F12.5 | La validation crée une ou plusieurs tâches planifiées, dates modifiables | M |
| F12.6 | Ne jamais émettre deux fois la même recommandation pour la même colonie tant que la précédente n'est pas traitée | M |
| F12.7 | Fonctionner intégralement hors-ligne | M |
| F12.8 | Écran de paramétrage des seuils de chaque règle | M |
| F12.9 | Activer ou désactiver une règle individuellement | M |
| F12.10 | Historique complet des recommandations, y compris rejetées, avec motif | M |
| F12.11 | Rattacher l'effet observé à la visite suivante | S |
| F12.12 | Arbitrage IA en cas de règles concurrentes, proposé et non appliqué | S |
| F12.13 | Piste IA lorsque aucune règle ne couvre l'observation, **signalée visuellement comme non validée par une règle** | S |
| F12.14 | Transmettre au contexte IA les recommandations rejetées et leurs motifs | C |
| F12.15 | Ingestion quotidienne et conservation de la météo observée par rucher | M |

---

## 8. Règles de conception non négociables

1. **Aucune action n'est exécutée sans validation explicite.** Le moteur propose, l'apiculteur décide. Aucune tâche, aucune écriture, aucune notification d'action réalisée sans validation.
2. **Toute recommandation est traçable.** Code et version de la règle, événement déclencheur, valeurs des données au moment du déclenchement. C'est ce qui permet de répondre à un contrôle et de comprendre a posteriori une décision.
3. **Les quantités et concentrations ne sont jamais générées par l'IA.** Elles proviennent des règles ou d'un choix explicite.
4. **Les garde-fous sont indissociables de la recommandation.** Ils ne sont pas repliés dans un second écran.
5. **Le silence est une réponse valable.** Une application qui recommande trop est désactivée en trois semaines. Plafonner le nombre de recommandations actives simultanément et privilégier l'urgence réelle.
6. **En cas de doute, recommander d'observer plutôt que d'agir.** Cohérent avec une conduite respectueuse du vivant : l'intervention minimale est la position par défaut.

---

## 9. Impact sur les jalons

Le module M12 s'insère entre les lots L3 et L4 :

| Lot | Contenu |
|---|---|
| L3 | Sanitaire, récoltes, tâches manuelles |
| **L3bis** | **Ingestion météo quotidienne + moteur de règles + trois règles pilotes** (R-NOUR-01, R-ORPH-02, R-VARR-01) |
| L4 | Registre d'élevage |

**L'ingestion météo doit être mise en service dès le lot L1**, même sans moteur de règles : l'historique climatique ne se reconstitue pas rétroactivement, et une année de données manquantes retarde d'autant la calibration des seuils.

---

## 10. Points ouverts

- Calibration des seuils climatiques sur ton altitude et ton microclimat — à réviser après une saison complète d'observation
- Fenêtre saisonnière des règles de nourrissement à ajuster sur la phénologie locale, notamment le décalage des miellées à 450 m
- Format de stockage des règles : fichier de configuration versionné, ou table éditable dans l'application — arbitrage à faire au développement
- Articulation avec le module verger mellifère (V2) : les floraisons observées deviendront un déclencheur à part entière
