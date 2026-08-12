# Brief — Refonte visuelle
## Système de design de l'application apicole

**Nature du lot.** Refonte de l'apparence uniquement. **Aucun changement de comportement, de schéma, de champ ou de parcours.** Si une modification visuelle exige de toucher à la logique, s'arrêter et demander.

---

## 1. Ce que doit être cette application

Un **instrument de terrain**, pas une application grand public. Elle est consultée debout, en plein soleil, entre deux ruches, souvent en quelques secondes. Sa parenté visuelle n'est pas l'application mobile de loisir : c'est le **carnet de bord et le registre d'élevage** — des documents réglés, denses, où chaque ligne est une entrée datée et où rien n'est décoratif.

Cette filiation n'est pas une image : c'est le principe qui tranche toutes les décisions ci-dessous.

---

## 2. Le piège à éviter absolument

Une application apicole appelle spontanément une palette miel, ambre et cire, des motifs en nid d'abeille, des hexagones et une abeille en icône. **C'est à la fois le cliché du domaine et une faute fonctionnelle.**

- Un ambre sur crème donne un contraste très faible, illisible en plein soleil.
- Si l'ambre est partout, l'état « Action » n'a plus aucun pouvoir de signal.

**Interdits explicites :** hexagones et nids d'abeille · abeille mascotte ou emoji · dégradés · fond crème avec accent terre cuite · mode sombre · effets de verre ou de flou · ombres portées · grands chiffres décoratifs en héros · icônes colorées en aplat.

---

## 3. Le parti pris central

> **La couleur ne sert qu'à coder un état. L'interaction s'exprime en encre et en graisse.**

Les boutons sont noirs sur papier, comme un formulaire tamponné. Aucune couleur d'accent, aucun bleu de lien, aucune teinte de marque. Toute la teinte disponible est réservée aux quatre états — urgent, action, à visiter, normale — qui deviennent de ce fait immédiatement lisibles.

C'est le seul geste fort du design. Tout le reste est discipliné et silencieux.

---

## 4. Jetons de design

À définir en variables CSS ou en configuration Tailwind **avant de toucher au moindre écran**. Aucune valeur codée en dur ailleurs.

### Couleur

```css
/* Fonds — papier, jamais crème */
--ground:        #FAFAF8;   /* fond d'écran */
--surface:       #FFFFFF;   /* cartes, lignes */
--surface-sunk:  #F3F3EF;   /* champs, zones creusées */

/* Encre */
--ink:           #1A1A17;   /* texte principal, boutons */
--ink-secondary: #5C5C55;   /* libellés, métadonnées */
--ink-muted:     #8A8A80;   /* mentions tertiaires */

/* Traits */
--rule:          #E3E2DC;   /* filets de séparation */
--rule-strong:   #C9C8C0;   /* bordures de contrôles */

/* États — seule couleur de l'interface */
--urgent-bg:     #FBEAE8;  --urgent-ink:    #8C1D18;
--action-bg:     #FCF0DC;  --action-ink:    #6B4106;
--attente-bg:    #F0EFEA;  --attente-ink:   #44443E;
--normale-bg:    #E4F2EA;  --normale-ink:   #12543C;
```

Tout texte sur fond teinté utilise l'encre de sa propre famille, jamais du noir.

### Typographie

Deux familles, deux rôles, rien de plus.

| Rôle | Famille | Usage |
|---|---|---|
| Interface | **Atkinson Hyperlegible** | Tous les libellés, titres, boutons |
| Données | **IBM Plex Mono** | Chiffres, dates, heures, compteurs, positions de cadre |

Atkinson Hyperlegible est conçue pour la lisibilité en conditions dégradées : caractères similaires nettement différenciés, ouvertures larges. C'est le choix cohérent pour un écran lu au soleil, à bout de bras, en mouvement — et il évite la sérif à fort contraste qui est le réflexe par défaut.

Le mono sur les chiffres n'est pas un effet de style : il donne des **chiffres tabulaires**, donc des colonnes de compteurs alignées et un comptage lisible d'un coup d'œil.

Les deux familles sont libres et disponibles sur Google Fonts. **Les charger en local dans le projet**, jamais depuis un CDN : l'application doit fonctionner hors réseau.

```
Échelle :  11 · 12 · 13 · 15 · 17 · 20 · 26
Graisses :  400 et 700 uniquement — pas de 500, 600
Interligne : 1.25 pour les titres, 1.5 pour le texte courant
```

### Espacement, rayons, filets

```
Espacement :  4 · 8 · 12 · 16 · 24 · 32     (aucune autre valeur)
Rayon :       6px partout — 0 sur les filets pleine largeur
Filets :      1px --rule
Élévation :   aucune. Les plans se distinguent par le fond et le filet.
```

Les ombres portées disparaissent en plein soleil : elles ajoutent du rendu sans ajouter d'information.

---

## 5. Composants

### Bouton principal
Fond `--ink`, texte `--surface`, hauteur 46px, pleine largeur, rayon 6px. **Un seul par écran.**

### Bouton secondaire
Fond `--surface`, texte `--ink`, bordure 1px `--rule-strong`, hauteur 40px.

### Compteur
Deux boutons carrés de 40px portant − et +, valeur centrale en mono 20px, valeur de référence dessous en 11px `--ink-muted`. Aucun champ de saisie.

### Sélecteur segmenté
Grille de boutons égaux, hauteur 40px, bordure `--rule-strong`. État actif : fond `--ink`, texte `--surface`. Pas de teinte.

### Chip de sélection
Hauteur 34px, bordure 1px `--rule-strong`, fond `--surface`. Sélectionné : fond `--ink`, texte `--surface`.

### Pastille d'état
11px, fond et encre de la famille d'état, rayon 6px. **L'état urgent porte en plus une icône.** Jamais de couleur seule.

### Ligne de colonie — élément signature

C'est le motif répété de toute l'application, et il doit se lire comme une ligne de registre.

```
[ 1 ]  Reine 2026                                 ( ✓ Normale )
       6 couvain · 4 provis. · vue il y a 2 j

[ 3 ]  Reine non confirmée                        ( ! Urgent )
       4 couvain · 3 provis. · vue il y a 9 j
       « Cadre de couvain introduit, contrôler l'operculation »
```

**Structure :**
- Badge du numéro à gauche, cercle de 28px, chiffre en mono 13px gras
- Titre de la colonie en 14px gras `--ink`
- Pastille d'état alignée à droite, sur la même ligne de base que le titre
- **Bandeau de trois métriques fixes** en mono 12px `--ink-secondary` (voir ci-dessous)
- Ligne de note conditionnelle en 12px italique (voir ci-dessous)
- Séparation par un filet 1px, **jamais par des cartes détachées** : la densité est une qualité ici, pas un défaut
- **Toute la ligne est cliquable.** Aucun bouton « Historique » ni « Voir détails » à l'intérieur

En état urgent, la ligne entière prend le fond `--urgent-bg`, le badge et le titre passent en `--urgent-ink`, et une icône d'alerte s'ajoute à la pastille.

**Hauteur cible :** 64px sans note, 88px avec note. Cinq colonies visibles sans défilement.

### Le bandeau de trois métriques

Trois valeurs, **toujours les mêmes, toujours dans le même ordre, à la même position** :

```
couvain · provisions · ancienneté de la dernière visite
```

En chiffres tabulaires (mono), séparés par des points médians. On apprend à lire une position, pas un texte — c'est ce qui permet de balayer une liste de dix colonies en trois secondes.

**Distinction vide / zéro, impérative :**
- `—` signifie **non observé**
- `0` signifie **observé, aucun cadre**

Ces deux états ne doivent jamais se confondre visuellement.

*Ces trois métriques sont une hypothèse à confirmer après quelques tournées réelles. Elles se changent en un seul endroit du code.*

### La ligne de note

Reprise de la dernière observation libre de la colonie, en 12px italique, guillemets français, une ligne tronquée si nécessaire.

**Règle d'affichage stricte : elle ne s'affiche que sur les colonies en état Action ou Urgent.** Une note sur chaque ligne les banalise toutes et annule la densité gagnée. Elle doit rester l'exception qui saute aux yeux.

C'est le seul endroit de l'interface où l'apiculteur relit ses propres mots. Elle porte du sens là où le reste porte des données.

---

## 6. Règles de mise en page

1. **Un seul bouton principal par écran.** Tout le reste est secondaire ou tertiaire.
2. **Actions en bas.** Rien d'actionnable en haut d'écran : le pouce n'y arrive pas.
3. **Densité assumée.** Lignes réglées plutôt que cartes espacées. On doit voir cinq colonies sans faire défiler.
4. **Aucune information portée par la seule couleur.** Toujours teinte + libellé + icône ou forme.
5. **Légende des états** présente sur tout écran qui les emploie.
6. **Cibles tactiles de 44px minimum**, 48px sur les contrôles de saisie.
7. **Aucun état vide muet.** Un écran sans donnée propose l'action qui le remplit.
8. **Aucune photo décorative.** Les photos servent à documenter une observation, jamais à illustrer une carte ou un en-tête. Elles alourdissent le stockage hors-ligne sans rien apprendre.
9. **Aucun bouton à l'intérieur d'une ligne de liste.** La ligne entière est la cible.

---

## 7. Écriture des libellés

Les mots sont de la matière de design.

- Verbes à l'infinitif ou à l'impératif, jamais de formule commerciale : « Enregistrer », pas « Valider ma saisie ».
- Une action garde le même nom d'un bout à l'autre du parcours.
- Vocabulaire apicole exact : colonie et ruche ne sont pas synonymes, hausse n'est pas corps, couvain operculé n'est pas couvain fermé.
- Les erreurs disent ce qui s'est passé et quoi faire. Elles ne s'excusent pas.
- Pas de majuscule décorative : phrase capitalisée normalement.

---

## 8. Méthode de travail

**Étape 1 — Jetons.** Créer le fichier de jetons, charger les deux polices en local, appliquer les fonds et la typographie globalement. Ne rien faire d'autre. Faire une capture avant et après.

**Étape 2 — Composants.** Reprendre les six composants du §5 en isolant chacun. Vérifier chaque cible tactile.

**Étape 3 — Vue d'ensemble du rucher.** L'écran le plus visible. La ligne de colonie du §5 en est le cœur.

**Étape 4 — Saisie de visite.** Compteurs, segmentés, chips. Vérifier chronomètre en main que la saisie tient toujours sous la minute.

**Étape 5 — Écrans restants.** Historique, import, export, paramètres.

**Étape 6 — Revue.** Contraste, cibles tactiles, états vides, focus clavier visible.

Valider chaque étape avant la suivante, capture d'écran à l'appui.

---

## 9. Critères d'acceptation

1. Le contraste du texte principal sur son fond atteint au moins 7:1.
2. Aucune information n'est portée par la seule couleur.
3. Aucun ambre, aucun miel, aucun hexagone hors de la famille d'état « Action ».
4. Aucune ombre portée, aucun dégradé.
5. Les deux polices sont servies depuis le projet et l'application reste fonctionnelle en mode avion.
6. Toute cible tactile mesure au moins 44px.
7. Cinq colonies sont visibles sans défilement sur un téléphone courant.
8. Les trois métriques occupent la même position sur chaque ligne, en chiffres tabulaires.
9. Le tiret du non-observé se distingue sans ambiguïté du zéro observé.
10. La ligne de note n'apparaît que sur les états Action et Urgent.
8. La saisie d'une visite tient toujours sous la minute.
9. Aucun comportement, aucun champ, aucune table n'a été modifié.

---

## 10. Références écartées

Une maquette de tableau de bord apicole a servi de point de comparaison. Trois éléments en ont été retenus : le bandeau de métriques fixes, la ligne de note en langage humain, et le constat qu'une vue liste est indispensable dès que la densité compte.

**Tout le reste a été écarté, délibérément :** photos décoratives en tête de carte · motif hexagonal · statistiques globales en héros — qui afficheraient ici 1 rucher, 3 colonies, 0 kg · bouton « Voir détails » dans chaque carte alors que la carte devrait être cliquable · libellés en gris clair, illisibles au soleil.

Ces choix appartiennent à un tableau de bord bureau conçu pour une exploitation de plusieurs dizaines de ruchers. Ils ne se transposent pas à un instrument de terrain utilisé sur trois colonies.

---

## 11. Ce qui reste ouvert

Le §3 est un parti pris fort : hue réservée aux états, interaction en encre. S'il produit un rendu trop austère à l'usage, la correction se fait en un seul endroit — introduire une couleur d'interaction unique dans les jetons — sans toucher aux écrans. C'est précisément pourquoi les jetons passent en premier.
