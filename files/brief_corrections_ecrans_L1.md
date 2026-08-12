# Corrections des écrans L1
## Revue sur captures — 11 août 2026

**Constat général :** les jetons du brief de refonte ne sont pas appliqués. Police système, bleu par défaut du navigateur, liens soulignés bruts, cartes détachées. Le §4 du brief de refonte reste donc entièrement à faire.

Mais avant la refonte visuelle, six défauts d'utilisabilité doivent être corrigés. Un est bloquant.

---

## 1. BLOQUANT — Les compteurs n'ont aucun libellé

**Constat.** L'écran de saisie affiche trois compteurs identiques, réduits à `− · +`, sans aucun titre. Rien ne permet de savoir lequel correspond au couvain operculé, au couvain ouvert ou aux provisions.

**Conséquence.** L'écran principal de l'application est inutilisable. Une saisie faite dans le doute produit des données fausses, ce qui est pire que pas de données.

**Correction.** Chaque compteur porte :
- un libellé en 13px au-dessus ou à gauche : « Couvain operculé », « Couvain ouvert », « Provisions »
- la valeur de référence en 11px en dessous : « 6 le 26/07 », ou « non observé » en l'absence de visite précédente
- une disposition en ligne : libellé à gauche, contrôle à droite, comme spécifié à l'addendum ergonomie §6

Les trois compteurs empilés verticalement, jamais côte à côte : côte à côte, ils sont trop étroits pour porter leur libellé.

---

## 2. Deux couleurs d'accent différentes, toutes deux interdites

**Constat.** Bouton bleu sur la vue d'ensemble, bouton vert sur la saisie. Aucun rapport entre les deux.

**Conséquence.** Le vert est une couleur d'état — celle de « Normale ». L'employer sur un bouton d'action détruit le code d'états avant même qu'il serve. Et deux accents différents sur deux écrans signifient qu'il n'y a pas de système.

**Correction.** Application stricte du §3 du brief de refonte : **tous les boutons principaux en encre `--ink` sur fond blanc**, aucune teinte. La couleur ne sert qu'aux quatre états.

---

## 3. Les liens utilitaires sont traités comme des actions principales

**Constat.** « Importer l'historique CSV », « Sauvegarder », « Restaurer » apparaissent en bleu souligné, en troisième position sur l'écran d'accueil, juste sous le bouton principal.

**Conséquence.** Ce sont des actions de maintenance, utilisées quelques fois par an. Elles occupent la zone la plus visible de l'écran le plus consulté.

**Correction.** Les déplacer en pied d'écran, sous la liste des colonies, en texte secondaire de 12px. Aucun soulignement, aucun bleu.

---

## 4. Les flèches de réordonnancement sont permanentes

**Constat.** Chaque ligne de colonie porte deux flèches empilées, occupant une colonne entière, en permanence.

**Conséquence.** L'ordre de tournée se règle une fois puis ne bouge plus. Une affordance permanente pour une action annuelle consomme de la largeur et de l'attention à chaque consultation.

**Correction.** Un lien « modifier l'ordre » à droite du titre « Ordre de tournée ». Les flèches n'apparaissent qu'en mode édition, et disparaissent à la validation.

---

## 5. Densité insuffisante

**Constat.** Trois colonies remplissent tout l'écran. Cartes détachées, marges internes larges, lien « Historique » sur une ligne propre à l'intérieur de chaque carte.

**Conséquence.** Le critère du brief — cinq colonies visibles sans défilement — n'est pas atteint avec trois ruches. Avec dix, l'écran devient impraticable.

**Correction.**
- Lignes réglées séparées par un filet 1px, **pas de cartes**
- Hauteur de ligne cible : 64px
- Le lien « Historique » disparaît : **toute la ligne est cliquable** et ouvre la fiche de la colonie
- Structure conforme à l'élément signature du brief de refonte §5

---

## 6. Trop de contrôles visibles simultanément à la saisie

**Constat.** Population, Ponte, Score de ponte, Reine vue, Œufs vus, Anomalies — huit chips déployées en permanence, plus les signes sanitaires à venir.

**Conséquence.** L'écran devient un long formulaire à défilement, alors que la cible est une saisie sous la minute. Chaque champ ajouté allonge la distance à parcourir.

**Correction.**
- « Reine vue » et « Œufs vus » deviennent **deux interrupteurs simples**, pas deux paires oui/non. Quatre boutons pour deux booléens, c'est le double de l'espace nécessaire
- Les anomalies sont **repliées** sous un intitulé « Signaler une anomalie », dépliées à la demande
- Les signes sanitaires du lot L1+ sont repliés de la même façon, dans un bloc distinct
- Espacement vertical entre sections ramené à 16px

---

## 7. Correction de spécification — la ponte est saisie deux fois

**C'est une erreur de ma spécification, pas du développement.** Le cahier des charges définit `ponte_qualite` (compacte / lacunaire / absente / mâles) **et** `score_ponte` (1–5). Ces deux champs décrivent la même chose et se contredisent potentiellement : rien n'empêche de saisir « compacte » avec un score de 2.

**Correction : un seul contrôle, six niveaux.**

```
Ponte
[ Aucune ] [ Très dispersée ] [ Lacunaire ] [ Correcte ] [ Compacte ] [ Très compacte ]
                    1                2            3           4              5
```

- Le champ `score_ponte` reste la donnée stockée, valeur 0 pour « Aucune »
- Le champ `ponte_qualite` est **supprimé du schéma**, avec migration des valeurs existantes :
  compacte → 4 · lacunaire → 2 · absente → 0
- **« Mâles » n'appartient pas à cette échelle** : ce n'est pas un degré de compacité mais un état distinct. Le déplacer dans les anomalies, sous l'intitulé « Ponte de mâles », aux côtés de « Bourdonneuse »

Migration à traiter avec les mêmes précautions que celle du lot L1+ : aucune perte de donnée, vérification par export JSON avant et après.

---

## 8. Correction de spécification — la distinction vide / zéro n'est pas lisible

**Constat.** Un compteur non renseigné affiche `·`, ce qui est juste sur le principe mais indéchiffrable sans libellé et sans légende.

**Correction.** Conserver le point comme marque de valeur non observée, mais l'accompagner systématiquement de la mention « non observé » sous le compteur — déjà présente, elle devient lisible une fois les libellés ajoutés au point 1. Ajouter le rappel dans l'écran d'aide : un compteur à 0 signifie « observé, aucun cadre » ; un point signifie « non observé ».

---

## 9. NOUVEAU — Cinq contrôles pour une seule question

**Constat.** L'écran de saisie comporte cinq blocs qui répondent tous à « cette reine pond-elle correctement ? » : couvain operculé, couvain ouvert, Ponte, Score de ponte, Œufs vus. Ils sont dispersés sur toute la hauteur de l'écran, sans lien visuel entre eux.

**Conséquence.** L'écran est incompréhensible. L'utilisateur ne sait pas quel contrôle renseigner, ni si les autres deviennent redondants. C'est un défaut de structure, pas de style : le styliser ne le corrigera pas.

**Correction — passer de sept blocs à cinq.**

### 9.1 Un seul compteur de couvain

Remplacer les deux compteurs « couvain operculé » et « couvain ouvert » par un compteur unique **« Cadres de couvain »**.

Le détail operculé / ouvert reste disponible derrière un lien **« Détailler operculé / ouvert »** en pied du bloc, qui déplie deux sous-compteurs. Les deux champs du schéma sont conservés ; c'est l'affichage par défaut qui change.

Motif : la distinction operculé / ouvert n'a d'intérêt que dans un diagnostic. Une visite de routine ne demande qu'un ordre de grandeur.

### 9.2 Un bloc « Reine et ponte »

Regrouper sous un seul intitulé, dans cet ordre :

1. Deux **interrupteurs** côte à côte : « Reine vue », « Œufs vus ». Pas de paires Oui/Non — quatre boutons pour deux booléens, c'est le double de l'espace nécessaire
2. Une **échelle unique de 0 à 5**, remplaçant à la fois « Ponte » et « Score de ponte »
3. Sous l'échelle, le **libellé de la valeur sélectionnée**, qui enseigne le barème :

```
0  aucune ponte
1  très dispersée, mosaïque
2  lacunaire, nombreux trous
3  correcte, cellules vides dispersées
4  compacte, quelques cellules vides
5  très compacte, ≥ 90 % des cellules operculées
```

Tant que rien n'est sélectionné, afficher la légende des deux extrêmes.

« Mâles » quitte cette échelle et rejoint les anomalies, sous l'intitulé « Ponte de mâles » — voir §7.

### 9.3 Libellé et contrôle sur la même ligne, dans un même cadre

**Constat.** Les libellés sont à l'extrême gauche, les compteurs à l'extrême droite, séparés par toute la largeur de l'écran. L'association est difficile à faire du regard.

**Correction.** Chaque compteur est enfermé dans un cadre à filet, libellé à gauche, contrôle à droite, dans un bloc visuellement unitaire.

### 9.4 BLOQUANT — Aucune valeur ne doit être sélectionnée par défaut

**Constat.** La valeur 1 de « Population » apparaît sélectionnée alors que l'utilisateur n'a rien choisi.

**Conséquence.** L'application enregistre une observation qui n'a jamais été faite. C'est le défaut le plus grave possible dans un carnet de bord : une donnée fausse est pire qu'une donnée absente, parce qu'on lui fait confiance.

**Correction.** Aucune échelle segmentée ne porte de sélection initiale. L'absence de sélection signifie « non observé » et doit être explicitée par une mention sous le contrôle.

### 9.5 Le vert est toujours présent

Le bouton « Rien à signaler » et la valeur sélectionnée de « Population » sont en vert — la couleur de l'état « Normale ». Voir §2 : **tous les contrôles en encre `--ink`, aucune teinte hors états.**

---

## Ordre de correction

1. ~~Libellés des compteurs~~ — **fait**
2. **Supprimer toute sélection par défaut** (§9.4) — bloquant, corruption de données
3. Bloc « Reine et ponte » : interrupteurs + échelle unique 0–5 (§9.2), avec la migration du §7
4. Compteur de couvain unique, détail repliable (§9.1)
5. Libellé et contrôle dans un même cadre (§9.3)
6. Repli des anomalies sous « Signaler une anomalie »
7. Densification de la liste des colonies, lignes réglées, ligne entièrement cliquable
8. Déplacement des liens utilitaires en pied d'écran
9. Réordonnancement par appui long sur le badge de numéro
10. **Puis seulement** : application des jetons de design du brief de refonte

Les rangs 2 à 6 concernent le même écran. Les traiter d'un bloc, puis chronométrer une saisie complète avant de passer à la suite.

Cet ordre est délibéré. Corriger la structure avant l'apparence évite de styliser des composants qui vont disparaître.

---

## Critères de vérification

1. Chaque compteur porte un libellé lisible sans contexte.
2. Un seul champ décrit la ponte.
3. Aucun bouton ne porte de vert ni de bleu.
4. Cinq colonies sont visibles sans défilement.
5. Toute la ligne d'une colonie est cliquable.
6. L'écran de saisie tient en un défilement au plus.
7. La saisie d'une visite reste sous la minute.
8. L'export JSON avant et après migration restitue les mêmes données de ponte.
9. **Aucun contrôle n'est sélectionné à l'ouverture d'une nouvelle visite.**
10. L'écran de saisie comporte cinq blocs, pas sept.
11. Un seul contrôle décrit la ponte, avec le libellé de la valeur sélectionnée affiché dessous.
12. Le compteur de couvain affiche une valeur unique ; le détail operculé / ouvert est replié.
13. Chaque compteur, son libellé et sa valeur de référence tiennent dans un même cadre.
