# Brief L3bis — Météo historique et moteur de règles (M12)

**Rédigé par** 1-SPEC — 18/08/2026
**Source principale** `files/Archives/addendum_M12_moteur_recommandations.md`
**Cartographie** `files/observation_cadre_et_cartographie_lots.md`, §L3bis (L3b.1 à L3b.12)
**Séquence actée** L3bis → L4 (Économique) → L5 (Registre d'élevage)

---

## 0. Avertissement de méthode — à lire avant tout

L'addendum M12 date du **10 août 2026**. Il est antérieur à la quasi-totalité de la
trajectoire réelle : livraison de L2.2 (12/08), de L3 (13/08), arbitrages des 14, 15 et
16/08, refonte visuelle, et surtout **l'extension des règles §6.3 du 16/08** qui a livré
sept règles de plus.

Il est aussi le **seul document de référence à n'exister que dans `files/Archives/`**, alors
que `README_documents.md` le classe parmi les documents de référence actifs. Vérification
faite : `Archives/` contient des instantanés périmés (le cahier des charges y compte 463
lignes contre 647 à la racine), mais M12 n'y a pas de version plus récente — **la copie
archivée est la seule qui existe**, et elle n'a jamais été mise à jour.

Conséquence pratique : **M12 ne peut pas être spécifié tel quel.** Six de ses quinze règles
sont déjà livrées et fonctionnent en production, sur un régime que M12 interdit
explicitement. Ce brief réconcilie les deux. Il ne reprend de M12 que ce qui reste valide.

`README_documents.md` est lui-même périmé (daté du 11/08, il annonce « lot en cours : L1+ »).
À rafraîchir, hors de ce lot.

---

## 1. Objectif

Doter l'application d'un **historique météo par rucher** et d'un **moteur de règles
déterministe et versionné** capable de croiser météo, calendrier, état de colonie et absence
d'observation, pour proposer des actions traçables — là où les règles actuelles ne savent
réagir qu'à un événement de saisie isolé.

Le moteur **propose**, il ne décide pas. Toute recommandation porte son énoncé, sa
justification, les données qui l'ont déclenchée, ses garde-fous et ses sources.

---

## 2. Trois arbitrages actés — 18 août 2026

Ces trois points déterminaient la forme du lot. Ils ont été **tranchés par l'exploitant le
18/08/2026**, conformément aux propositions ci-dessous. Le reste du brief les applique : il
est exécutable en l'état.

### 2.1 Coexistence de deux régimes de génération de tâches — **structurant**

**Le conflit.** M12 §8.1 pose comme non négociable : « Aucune action n'est exécutée sans
validation explicite. Le moteur propose, l'apiculteur décide. **Aucune tâche** […] sans
validation. » Et L3b.7 impose un cycle de vie `proposée / validée / différée / rejetée`.

**Mais l'application fait aujourd'hui exactement l'inverse**, et c'est un arbitrage récent et
délibéré. Quatorze règles créent des tâches **automatiquement, sans aucune validation** :

| Origine | Règles |
|---|---|
| Anomalies de visite (§20, 16/08) | `visite_bourdonneuse_secouer`, `visite_pillage`, `visite_fausse_teigne`, `visite_mortalite_anormale`, `visite_diarrhee`, `visite_abeilles_tremblantes`, `visite_ponte_males` |
| Visite (§6.3) | `visite_cellules_essaimage`, `visite_hausse_posee`, `visite_cadre_couvain_introduit` (cascade J+9/16/28) |
| Autres modules | `mouvement_division`, `traitement_delai_attente`, `varroa_fort`, `varroa_modere`, `pas_de_visite_21j` |

Le §20 du cahier des charges est explicite sur l'intention : « chacune directement — signaler
l'anomalie + enregistrer la visite suffit, **aucune condition supplémentaire** ».

**La question.** Deux régimes vont-ils coexister — tâches automatiques pour les règles à
seuil fixe, recommandations à valider pour les règles du moteur — ou L3bis fait-il basculer
l'ensemble sous le cycle de vie de M12 ?

**Décision actée : les deux régimes coexistent, et la frontière est le déterminisme.**

- Une règle dont le déclencheur est **un fait saisi par l'apiculteur lui-même** (il a coché
  « pillage », il a posé une hausse, il a enregistré un traitement) n'a pas à être validée :
  il vient de le constater. Lui redemander confirmation est une friction pure. C'est le
  régime actuel, il fonctionne, il a été arbitré le 16/08 — on n'y touche pas.
- Une règle dont le déclencheur est **une inférence du moteur** (croisement météo, absence
  d'observation, seuil calculé) propose et attend validation : l'apiculteur n'a rien constaté
  lui-même, le moteur peut se tromper, et M12 §8.1 s'applique pleinement.

Cette frontière recoupe d'ailleurs ce que la cartographie prévoyait déjà en L3b.6 :
« génération automatique de tâches — **règles météo-dépendantes uniquement** ; les règles à
seuil fixe sont livrées en L2.2 ».

**Conséquence** : aucune régression sur l'existant,
aucune migration des quatorze règles livrées, et `tache.origine` (`manuelle` / `générée`)
reste tel quel — les recommandations validées créent des tâches `générée` comme aujourd'hui.

### 2.2 Le catalogue « de quinze règles » n'en contient que neuf de nouvelles

**Le constat.** L3b.5 annonce un « catalogue initial de quinze règles ». Mais confrontation
faite règle par règle au code livré : **six des quinze sont déjà en production**.

| Code M12 | Déclencheur | Statut réel |
|---|---|---|
| R-ORPH-02 | Cadre de couvain introduit → J+9/16/28 | **Livré** (`visite_cadre_couvain_introduit`) |
| R-ESSA-01 | Cellules royales d'essaimage → J+7 | **Livré** (`visite_cellules_essaimage`) |
| R-VARR-01 | Comptage fort → J+2, J+21 | **Livré** (`varroa_fort`) |
| R-VARR-02 | Comptage modéré → J+14 | **Livré** (`varroa_modere`) |
| R-SANI-01 | Traitement → interdiction de récolte | **Livré** (`traitement_delai_attente` + interlock L3.2) |
| R-VISI-01 | Aucune visite depuis 21 jours | **Livré** (`pas_de_visite_21j`) |
| R-ORPH-01 | Bourdonneuse → trois conduites possibles | **Nouveau — règle du moteur, à validation** — voir ci-dessous |
| R-NOUR-01 | Canicule + sécheresse + provisions faibles | **Nouveau** — météo |
| R-CLIM-01 | Canicule annoncée → ombrage, ventilation, abreuvement | **Nouveau** — météo |
| R-CLIM-02 | Fenêtre favorable + visite en retard | **Nouveau** — météo (= L3b.12) |
| R-NOUR-02 | Provisions sous seuil à l'entrée de l'hivernage | **Nouveau** — calendrier + état |
| R-ESSA-02 | Colonie forte + hausse pleine → poser une hausse | **Nouveau** — état |
| R-VARR-03 | Aucun comptage depuis 45 jours en saison | **Nouveau** — absence |
| R-REGL-02 | Période de déclaration annuelle ouverte | **Nouveau** — calendrier |
| R-REGL-01 | Trimestre échu → imprimer et archiver le registre | **Bloqué** — voir §2.3 |

À noter : `mouvement_division` (J+21, contrôler la ponte de la nouvelle reine) est livré
alors qu'il **ne figure dans aucun des quinze codes de M12**. Le catalogue livré déborde déjà
celui de l'addendum.

**R-ORPH-01 — redéfinie, non écartée** *(arbitrage de l'exploitant, 18/08/2026)*

M12 réduisait la règle à un seul conseil, « introduire un cadre de couvain frais », là où le
§20 du 16/08 avait livré « secouer les cadres à 50 m ». La question n'était pas de choisir
entre les deux : **face à une bourdonneuse, trois conduites sont possibles**, et le choix
dépend de la force de la colonie et de l'avancement de la saison.

| Conduite | Nature | Ce qui la distingue |
|---|---|---|
| **Secouer les cadres à 50 m** | Immédiate, réversible, sans coût | Le premier geste : élimine les pondeuses sans rien engager |
| **Introduire un cadre de couvain frais** | Structurelle, coûteuse pour la colonie donneuse | Donne à la colonie le moyen de se refaire une reine — déclenche la cascade J+9/16/28 (R-ORPH-02) |
| **Introduire une nouvelle reine** | Structurelle, coûteuse en argent | Remplacement direct, sans attendre l'élevage |

**C'est exactement le cas d'usage du moteur** : un choix entre plusieurs conduites, qui
n'appartient pas à la machine. R-ORPH-01 devient donc une **règle du moteur, à validation** —
elle présente les trois conduites, l'exploitant en valide une ou plusieurs, et chaque
validation crée ses propres tâches.

**Articulation avec la règle déjà livrée, à ne pas dupliquer.** La tâche « secouer les cadres
à 50 m » est **déjà créée directement** à l'enregistrement de la visite (`visite_bourdonneuse_secouer`),
et ce comportement ne change pas : c'est un fait saisi, il relève du premier régime (§2.1).
La recommandation R-ORPH-01 doit donc présenter cette première conduite comme **déjà
planifiée**, et ne proposer à validation que les deux autres. Sans quoi l'exploitant voit deux
fois la même action.

**Périmètre de règles retenu pour L3bis : neuf règles nouvelles**, dont trois
météo-dépendantes.

### 2.3 R-REGL-01 dépend d'un lot désormais postérieur

R-REGL-01 (« trimestre échu → imprimer et archiver le registre ») suppose que le registre
d'élevage existe. Or la séquence actée place le **Registre en L5**, après L3bis et après L4.
La règle n'a rien à déclencher.

**Décision actée : reporter R-REGL-01 en L5**, avec le registre. Le moteur étant versionné
et son catalogue extensible, l'ajouter plus tard ne coûte rien — c'est précisément ce que
l'architecture prévoit.

---

## 3. Périmètre

### Dans L3bis

1. **Table `meteo_journaliere`** — un relevé observé par rucher et par jour (L3b.2).
2. **Reconstitution de l'historique** par API d'archive (L3b.1).
3. **Quatre agrégats** : épisode caniculaire, sécheresse, pluie prolongée, gel tardif (L3b.3),
   plus la fenêtre de visite favorable (L3b.12).
4. **Moteur de règles déterministe et versionné** (L3b.4), fonctionnant intégralement
   hors-ligne (F12.7).
5. **Catalogue de neuf règles** (§2.2), seuils paramétrables par règle (L3b.9), activation
   ou désactivation individuelle (F12.9).
6. **Cycle de vie** `proposée / validée / différée / rejetée / ignorée` (L3b.7), pour les
   règles du moteur uniquement (§2.1).
7. **Traçabilité complète** : code et version de la règle, événement déclencheur, valeurs des
   données au moment du déclenchement (L3b.8, F12.10).
8. **Plafond de deux recommandations urgentes par rucher** (L3b.10).
9. **Effet observé** rattaché à la visite suivante (L3b.11) — priorité secondaire.

### Explicitement hors de L3bis

- **Toute couche IA** — arbitrage de règles concurrentes (F12.12), piste hors catalogue
  (F12.13), transmission des rejets au contexte (F12.14). M12 §2.1 la classe déjà comme
  « réseau requis », donc incompatible avec le parcours de saisie. Elle relève de L6
  (Assistant IA). **Le moteur déterministe doit être complet sans elle.**
- **Migration des quatorze règles livrées** vers le cycle de vie (§2.1).
- **R-REGL-01** (§2.3), reportée en L5 avec le registre.
- **Module verger mellifère** — M12 §10 le mentionne comme futur déclencheur, il est en V2.
- **Notifications push** — jamais spécifiées, non ajoutées ici.

---

## 4. Ce qui existe déjà, à réutiliser sans le reconstruire

La vérification du code livré évite deux reconstructions inutiles :

- **`meteo_cache`** (`src/db/db.js`, v10) existe, mais c'est **une prévision par rucher,
  écrasée à chaque récupération, explicitement jamais un historique**. Elle ne convient pas
  au moteur : les agrégats se calculent sur du passé observé. `meteo_journaliere` est donc
  une table nouvelle, à côté, sans remplacer `meteo_cache` qui sert l'écran Météo.
- **Open-Meteo est déjà le fournisseur** (`src/lib/meteo.js`). Son API d'archive couvre
  L3b.1 sans nouvelle dépendance, sans clé et sans coût — cohérent avec la contrainte
  « ≤ 0 € par mois ».
- **`rucher` porte `latitude` et `longitude`** : la météo par rucher est calculable pour
  chacun, pas seulement pour le rucher domicile (que la station Netatmo couvre déjà, §19).
- **`tache` porte `regle_origine` et `visite_declencheuse_id`** : le rattachement d'une tâche
  à la règle qui l'a produite existe déjà, à réutiliser tel quel.

**Bonne nouvelle sur un point que M12 annonçait comme perdu.** M12 §9 avertit que
« l'ingestion météo doit être mise en service dès le lot L1 » car « les données passées ne se
rattrapent pas ». C'est **obsolète** : l'API d'archive d'Open-Meteo remonte à 1940. Aucune
donnée n'est perdue, et la calibration des seuils n'est pas retardée d'une saison.

---

## 5. Modèle de données

Reprend M12 §3, corrigé de ce qui est déjà livré.

**`meteo_journaliere`** — *nouvelle, locale, reconstructible*
```
rucher_id, date, t_min, t_max, precipitations_mm, vent_moyen, humidite,
source (archive | prevision | netatmo), type (observe | prevu)
```
Clé composite `[rucher_id+date]`. **Non synchronisée** : ces données sont identiques sur tous
les appareils et se reconstruisent depuis l'archive — les synchroniser gonflerait le volume
sans bénéfice. Même logique que `meteo_cache`.

**`regle`** — *nouvelle*
```
code, libelle, version, famille, declencheurs (JSON), conditions (JSON),
fenetre_saisonniere, enonce_modele, justification, sources, garde_fous (JSON),
urgence (1-3), actions_proposees (JSON), active (bool), parametres_utilisateur (JSON)
```

**`recommandation`** — *nouvelle*
```
regle_code, regle_version, colonie_id (nullable), rucher_id (nullable),
date_emission, enonce, justification, sources, garde_fous, urgence,
donnees_declenchement (JSON), statut (proposee | validee | differee | rejetee | ignoree),
motif_rejet, differee_au, tache_id, traitee_le
```
`donnees_declenchement` fige les valeurs au moment du déclenchement : c'est ce qui permet de
répondre à « pourquoi cette recommandation le 14 août ? » six mois plus tard (M12 §8.2).

**`observation_effet`** — *nouvelle, priorité secondaire (L3b.11)*
```
recommandation_id, visite_id, effet (favorable | sans_effet | defavorable), commentaire
```

**Table `evenement` de M12 §3 : écartée.** Elle servait à journaliser tout déclencheur
possible. Les événements réels sont déjà lisibles dans `visite`, `meteo_journaliere`,
`comptage_varroa` et le calendrier — une table de journalisation supplémentaire dupliquerait
ces données sans usage identifié. `recommandation.donnees_declenchement` assure la
traçabilité voulue. À rouvrir si un besoin concret apparaît.

Champs communs habituels (`id`, `created_at`, `updated_at`, `deleted_at`) et suppression
logique uniquement, conformément au §4 du cahier des charges.

---

## 6. Agrégats météo

Seuils par défaut de M12 §4.2, **tous paramétrables** (L3b.9) :

| Agrégat | Définition par défaut |
|---|---|
| Épisode caniculaire | ≥ 3 jours consécutifs à T max ≥ 32 °C |
| Sécheresse | cumul de précipitations < 20 mm sur 30 jours glissants |
| Pluie prolongée | ≥ 5 jours consécutifs avec précipitations |
| Gel tardif | T min < 0 °C après le 1er avril |
| Fenêtre de visite favorable | T max entre 15 et 28 °C, vent < 20 km/h, pas de pluie |

M12 §4.2 précise que ces valeurs sont à recaler sur le contexte réel — **450 m d'altitude en
Haut-Mâconnais, où les températures décrochent de plusieurs degrés par rapport à la plaine**.
D'où l'exigence de paramétrage : les défauts sont un point de départ, pas une vérité.

Les agrégats se calculent **localement, depuis `meteo_journaliere`**, jamais par appel réseau
au moment de l'évaluation — c'est la condition de F12.7 (hors-ligne intégral).

---

## 7. Écrans

Aucun langage visuel nouveau — jetons et composants existants (`EnTeteEcran`, `Compteur`,
`Segmente`, chips, pastilles d'état).

- **Recommandations en attente** — sur l'écran d'accueil, triées par urgence (F12.2), à côté
  du bloc « à faire en premier » existant, sans le remplacer : une recommandation n'est pas
  une tâche tant qu'elle n'est pas validée.
- **Détail d'une recommandation** — énoncé, justification, données déclenchantes, **garde-fous
  et sources**. M12 §8.4 est catégorique : les garde-fous ne sont **pas repliés dans un second
  écran**, ils sont indissociables de la recommandation. Trois actions : valider, différer
  (avec date), rejeter (avec motif).
- **Historique des recommandations**, rejetées comprises avec leur motif (F12.10).
- **Paramétrage des règles** — seuils par règle, activation/désactivation (F12.8, F12.9).
  Écran de réglage, pas de parcours terrain : accessible depuis l'accueil, pas depuis la
  saisie.

Rappel transverse : **aucun champ obligatoire nulle part**, y compris le motif de rejet — un
rejet non motivé reste un rejet.

---

## 8. Garde-fous de conception (M12 §8, non négociables)

1. Aucune action exécutée sans validation explicite — pour les règles du moteur (§2.1).
2. Toute recommandation traçable : code, version, événement, valeurs au déclenchement.
3. **Les quantités et concentrations ne sont jamais générées** — elles viennent des règles.
4. Les garde-fous sont indissociables de la recommandation.
5. **Le silence est une réponse valable** — « une application qui recommande trop est
   désactivée en trois semaines ». D'où le plafond de deux urgences par rucher (L3b.10).
6. En cas de doute, recommander d'observer plutôt que d'agir.

**Frontière avec l'interdiction de conseil sanitaire.** La règle transverse du projet — « aucun
conseil sanitaire ni diagnostic, à aucun moment » — et le §2 du brief L2.2 (« carnet de bord,
jamais un conseiller ») restent en vigueur. Elles ne s'opposent pas à ce lot : le §11 du
cahier des charges désigne M12 comme « la seule source de recommandations actionnables », et
le brief L2.2 exclut le moteur **de lui-même** en le renvoyant nommément à L3bis. La frontière
opérationnelle à tenir :

- le moteur propose des **actions de conduite** (aller vérifier, nourrir, ombrager, poser une
  hausse) — jamais un **diagnostic** ni un protocole de soin ;
- une recommandation n'est **jamais** un enregistrement sanitaire : elle ne s'écrit ni dans
  `traitement`, ni dans le registre, tant que l'apiculteur n'a pas saisi l'acte lui-même ;
- sur tout signe évoquant un danger de catégorie 1, le parcours existant (F3.8 : contenu
  réglementaire statique, renvoi vers vétérinaire/TSA/GDS) prime et n'est pas remplacé.

---

## 9. Ordre de travail

Chaque étape validée avant la suivante, passage au rucher recommandé aux étapes 4 et 6.

1. **`meteo_journaliere` + ingestion par API d'archive** — reconstitution de l'historique de
   chaque rucher, vérification par export JSON avant/après.
2. **Rafraîchissement quotidien** et repli hors-ligne.
3. **Calcul des agrégats**, testé sur l'historique reconstitué — les valeurs doivent être
   vérifiables à la main sur un épisode connu.
4. **Moteur d'évaluation** versionné + cycle de vie, avec **une seule règle pilote**
   (R-CLIM-01, la plus simple : un agrégat, aucune condition d'état).
5. **Catalogue complet** des neuf règles, seuils paramétrables. Traiter **R-ORPH-01 en
   dernier** : c'est la seule à proposer plusieurs conduites concurrentes et à devoir
   s'articuler avec une tâche déjà créée par ailleurs (§2.2).
6. **Écrans** : recommandations en attente, détail, historique, paramétrage.
7. **Plafond de deux urgences par rucher**, puis effet observé (L3b.11) si le temps le permet.
8. **Non-régression** : les quatorze règles existantes créent toujours leurs tâches
   directement, sans passer par le cycle de vie.

---

## 10. Critères d'acceptation

1. L'historique météo d'un rucher est reconstitué sur au moins douze mois et consultable.
2. Les quatre agrégats se calculent hors-ligne, sans aucun appel réseau.
3. Un agrégat vérifié à la main sur un épisode réel donne le même résultat que le moteur.
4. Une règle déclenchée produit une recommandation **proposée**, pas une tâche.
5. La validation d'une recommandation crée une tâche, dont la date reste modifiable.
6. Un rejet est conservé avec son motif et reste consultable dans l'historique.
7. Chaque recommandation affiche ses garde-fous et ses sources sur le même écran que son
   énoncé, sans repli.
8. Modifier un seuil change le comportement de la règle sans redéploiement.
9. Désactiver une règle la fait taire complètement.
10. Jamais plus de deux recommandations urgentes actives par rucher.
11. **Les quatorze règles livrées continuent de créer leurs tâches directement** — aucune
    régression, aucune validation intercalée.
12. Le moteur fonctionne intégralement sans réseau, une fois l'historique constitué.
13. L'export JSON restitue les nouvelles tables sans perte.
