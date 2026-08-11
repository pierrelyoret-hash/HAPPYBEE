# Brief — Lot L1+
## Complément au socle L1 déjà livré

**Contexte.** Le lot L1 a été livré le 10 août 2026 et fonctionne. **Ce lot est un incrément : rien n'est à reconstruire.** Le code existant reste en place ; il s'agit d'ajouter quatre éléments et une table.

---

## 1. Objectif

Compléter le carnet de visite avec la qualité du couvain et la dimension sanitaire, et préparer au schéma l'observation cadre par cadre qui arrivera au lot L2.

---

## 2. Périmètre

### Dans le lot

1. Champ `score_ponte` sur la visite, saisi au niveau colonie
2. Champ `signes_sanitaires` sur la visite, liste fermée multi-sélection
3. Parcours danger sanitaire de catégorie 1
4. Table `observation_cadre` au schéma, **sans aucune interface**
5. Champ `source_agregats` sur la visite, valeur unique pour l'instant

### Explicitement hors du lot

- **Écran de saisie cadre par cadre** — la table existe, l'interface appartient au lot L2
- Toute logique d'agrégation des cadres vers les compteurs de colonie
- Toute alerte, recommandation ou conseil déclenché par le score de ponte
- Toute entrée automatique au registre d'élevage (lot L4)
- Toute génération automatisée de tâches (lot L3bis)

---

## 3. Frontière à respecter

Le socle peut contenir du **contenu réglementaire statique** — le parcours danger sanitaire en est l'unique cas, justifié par une obligation légale de déclaration.

Le socle ne contient **aucune heuristique de conduite**. Le score de ponte est enregistré et ne déclenche rien. La règle qui le relie au comptage varroa existe, elle est spécifiée, et elle appartient au moteur du lot L3bis.

---

## 4. Spécification des champs

### `visite.score_ponte` — entier 1 à 5, nullable

Boutons segmentés, un appui, même composant que `population`.

```
5  très compact — ≥ 90 % des cellules operculées dans la zone de ponte
4  compact — quelques cellules vides
3  correct — cellules vides dispersées
2  lacunaire — nombreux trous
1  très dispersé — mosaïque
```

Le libellé court s'affiche sous la valeur sélectionnée. Champ facultatif, non reporté d'une visite à l'autre — c'est une observation, pas un état persistant.

### `visite.signes_sanitaires` — tableau, liste fermée

Chips multi-sélection, jamais pré-cochées, repliées par défaut sous un intitulé « signes observés ».

```
couvain en mosaïque
opercules affaissés ou percés
larves brunes visqueuses adhérentes          ⚠ catégorie 1
larves flasques jaune clair
larves en sac, écailles noires
momies blanches ou grises
odeur de colle ou putride                     ⚠ catégorie 1
odeur aigre
ailes déformées
varroas visibles
toiles ou galeries de fausse teigne
coléoptère noir dans les rayons               ⚠ catégorie 1
```

### `visite.source_agregats`

Énumération `saisie_directe | calcule_depuis_cadres`. Vaut toujours `saisie_directe`. Prévoir le champ, pas la logique.

### Table `observation_cadre`

Créée au schéma Dexie, avec `id`, `created_at`, `updated_at`, `deleted_at` comme les autres. Aucun écran, aucune écriture, aucune lecture en L1+.

```
visite_id, position (1-12), face (A|B), type_cadre

occupation en huitièmes, entiers 0-8 :
  couvain_opercule, couvain_ouvert, oeufs,
  miel_opercule, nectar_frais, pollen,
  cellules_vides, non_bati, couvain_male

score_ponte (1-5), homogeneite_stades (bool)
miel_qualite, pollen_diversite (1-5)
annee_cire, etat_bati (1-5), a_reformer (bool), motif_reforme
cellules_royales_nb, cellules_royales_type, cellules_royales_pos,
cellules_operculees (bool)
signes (tableau), test_allumette
```

Ajouter également `observation_cadre_id` (nullable) à la table `photo`.

**Motif de cette anticipation :** la bascule entre agrégat saisi et agrégat calculé change la nature des champs de comptage. La migrer plus tard, sur des données de production déjà accumulées, coûte nettement plus cher que de poser la table maintenant.

---

## 5. Parcours danger sanitaire de catégorie 1

Quatre dangers sont classés en première catégorie en France : **loque américaine, *Aethina tumida*, *Tropilaelaps*, nosémose à *Nosema apis***. Aucun traitement n'existe et l'usage d'antibiotiques est interdit.

**Déclenchement.** Sélection d'un des trois signes marqués ⚠ ci-dessus.

**Comportement, non contournable :**

1. Affichage immédiat, en pleine page, de la conduite à tenir :
   - Ne pas déplacer la ruche
   - Ne réutiliser aucun cadre ni élément de matériel
   - Isoler la colonie
2. Rappel de l'obligation de déclarer toute suspicion, et de contacter un vétérinaire, un technicien sanitaire apicole ou le GDS départemental
3. Mention du prélèvement attendu pour confirmation en laboratoire : un morceau de couvain d'environ 10 × 10 cm
4. Proposition du test de l'allumette comme test d'orientation, avec sa lecture :
   - filament gluant et élastique de plus de 2 cm, larve non extractible → oriente vers la loque américaine
   - masse pâteuse non filante → oriente vers la loque européenne
5. Création d'une tâche de priorité urgente, `origine = manuelle`
6. Marquage de la visite comme portant une suspicion réglementée

**Interdictions strictes :**

- L'application ne propose **aucun traitement**, ni médicamenteux, ni sanitaire
- L'application ne pose **aucun diagnostic**. Elle présente des signes d'orientation et renvoie vers le circuit officiel. Le diagnostic de certitude relève du laboratoire
- Le texte affiché est **statique, écrit en dur**. Aucun calcul, aucune inférence, aucun appel à un modèle de langage

---

## 6. Ordre de travail

1. **Migration du schéma** — ajout de `observation_cadre`, des trois champs sur `visite`, de `observation_cadre_id` sur `photo`. Vérifier que les données existantes survivent à la migration et que l'export JSON les restitue.
2. **Score de ponte** — champ, composant segmenté, intégration à l'écran de saisie et à l'historique.
3. **Signes sanitaires** — chips repliées, liste fermée.
4. **Parcours catégorie 1** — écran statique, création de tâche, marquage de la visite.
5. **Vérification de non-régression** — la saisie d'une visite reste sous la minute, aucun champ n'est devenu obligatoire.

Valider chaque étape avant la suivante.

---

## 7. Critères d'acceptation

1. Les données existantes sont intactes après migration, et l'export JSON les restitue.
2. Le score de ponte se saisit en un appui et n'entraîne aucune alerte ni conseil.
3. Le score de ponte n'est pas reporté d'une visite à l'autre.
4. Les signes sanitaires sont repliés par défaut et jamais pré-cochés.
5. Cocher un signe de catégorie 1 affiche la conduite à tenir et crée une tâche urgente.
6. Aucun traitement, aucun diagnostic n'est proposé nulle part.
7. La table `observation_cadre` existe au schéma sans qu'aucune interface ne l'alimente.
8. La saisie d'une visite reste réalisable en moins d'une minute.

---

## 8. Après L1+

**Ne pas enchaîner sur L2.** Utiliser l'application sur au moins trois visites réelles au rucher, puis conduire la **revue ergonomique** prévue à l'addendum ergonomie §10. C'est le dernier moment où corriger l'ergonomie coûte peu : à partir de L2, chaque changement d'écran se propage dans la dictée, la revue de tournée et la saisie cadre par cadre.
