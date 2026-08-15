# Handoff : refonte visuelle HAPPYBEE (bandeau de saison + fil de tournée)

## Overview
Refonte de l'apparence de l'application apicole HAPPYBEE (dépôt `pierrelyoret-hash/HAPPYBEE`, branche `main`).
Objectif : garder la discipline « instrument de terrain » du brief `files/brief_refonte_visuelle.md`
(densité de registre, chiffres tabulaires, teinte réservée aux états sur les lignes) tout en donnant à
l'application l'identité apicole chaleureuse demandée le 15/08/2026.

**Le geste retenu** : les jetons `--miel`, `--vert`, `--bordeaux` (déjà présents dans
`src/styles/index.css` depuis le 14/08) deviennent des couleurs **de structure** — bandeau d'en-tête,
progression de tournée, navigation — et **jamais** des couleurs d'état. Les quatre familles d'état
(urgent / action / à visiter / normale) conservent leur palette pastel et restent seules porteuses de
teinte à l'intérieur d'une ligne de colonie.

**Aucun changement de comportement, de champ, de table ou de parcours n'est demandé** par ce lot, à
une exception explicitement signalée (§ Fil de tournée, optionnel).

## About the Design Files
Le fichier `HAPPYBEE Refonte.dc.html` de ce dossier est une **référence de design en HTML** : une
maquette montrant l'apparence et le comportement visés. Ce n'est pas du code de production à copier.
La tâche est de **reproduire ces écrans dans l'environnement existant du dépôt** : React 18 + Vite +
Tailwind, jetons en variables CSS, composants dans `src/components/`, écrans dans `src/features/`.
Toute valeur visuelle passe par les jetons Tailwind déjà déclarés (`bg-miel`, `text-ink-secondary`,
`text-13`, …) — aucune valeur codée en dur dans un écran.

Ouvrir le fichier dans un navigateur pour voir les cinq options ; l'option **1e** est cliquable
(rucher → colonie → saisie de visite → retour, avec recalcul de l'état).

## Fidelity
**Haute fidélité.** Couleurs, typographies, tailles, hauteurs de cible tactile et copie sont finales
et reprises des jetons du dépôt. Reproduire au pixel en utilisant les classes Tailwind existantes.

---

## Ce qui change, fichier par fichier

### 1. Aucun nouveau jeton nécessaire
`src/styles/index.css` et `tailwind.config.js` contiennent déjà tout le nécessaire
(`--miel #D89A2E`, `--vert #2B6E48`, `--bordeaux #7A1830`, familles d'état, échelle 11→26).
Seule addition utile, pour l'encre lisible **sur** le miel :

```css
--sur-miel: #5C3E05;   /* métadonnées sur bandeau miel — contraste 5.1:1 sur #D89A2E */
```
et dans `tailwind.config.js` : `colors: { 'sur-miel': 'var(--sur-miel)' }`.
Le texte principal sur miel reste `text-ink` (#1A1A17).

### 2. Nouveau composant partagé : `src/components/EnTeteEcran.jsx`
C'est le cœur du lot : **tous les écrans** portent le même haut de cadre.

```
Bandeau : bg-miel, padding 10px 16px 14px (px-4 pt-2.5 pb-3.5)
  ├─ lien retour optionnel  : text-13, text-sur-miel, souligné, 4px de padding bas, cible 44px
  ├─ ligne titre            : flex, align-items baseline, justify-between, gap 12px
  │    ├─ titre             : text-20 font-bold text-ink   (leading 1.25)
  │    └─ élément de droite : compteur mono, pastille, ou chip « HORS LIGNE »
  ├─ sous-ligne contexte    : font-mono text-11 font-bold text-sur-miel, EN CAPITALES
  └─ barre de progression optionnelle :
       piste  h-1.5 rounded bg-[rgba(26,26,23,.2)]
       jauge  h-full bg-vert, transition width .35s ease
```

Règles :
- la barre d'état système (si simulée) prend aussi le fond miel — le bandeau est plein cadre,
  jamais d'interruption blanche entre le haut de l'écran et le bandeau ;
- le chip « HORS LIGNE » sur miel : `font-mono text-[10px] font-bold text-sur-miel`,
  bordure 1px `#5C3E05`, rayon 6px, padding 3px 6px ;
- sous-ligne toujours en capitales mono (ex. `5 COLONIES · ORDRE DE TOURNÉE`,
  `LE PRÉ LONG · 15/08 · 09:41`, `15 AOÛT · SEM. 33`) ;
- le bandeau remplace intégralement les `<header>` actuels **et** `BoutonRetour` en haut d'écran.

Props : `titre`, `contexte`, `retourLibelle`, `onRetour`, `droite` (nœud), `progression` ({fait, total}).

### 3. `src/features/accueil/Accueil.jsx`
- `<header><h1>HAPPYBEE</h1></header>` → `EnTeteEcran` : titre `HAPPYBEE` en
  `font-mono text-13 font-bold` avec `letter-spacing:.14em`, contexte = date + semaine
  (`15 AOÛT · SEM. 33`).
- Deux variantes documentées, à trancher (voir § Question ouverte) :
  - **1a — registre** : sous le bandeau, tout reste en encre. Ruchers en lignes réglées
    (`bg-surface`, filets `border-rule` haut/bas, pas de carte détachée), sous-titre
    `font-mono text-12 text-ink-secondary` = `commune · N ruches · N urgent`. Un bloc « À faire »
    de deux lignes maximum, la ligne échue sur `bg-urgent-bg text-urgent-ink`. Bouton principal
    noir `Ouvrir la tournée` (h-[46px]) en bas, puis trois boutons secondaires h-10
    (`Tâches`, `Météo`, `Nouveau rucher`).
  - **1b — bandeau de saison** : le bandeau miel s'étend et porte trois chiffres en
    `font-mono text-[40px] font-bold leading-none` — colonies / jours depuis la tournée / urgents
    (ce dernier en `text-urgent-ink`), libellés `text-11 text-sur-miel`, séparés par des filets
    verticaux `rgba(26,26,23,.25)`. Ruchers en cartes `bg-surface border border-rule rounded`
    avec un liseré gauche 4px `border-vert`, pastille d'état à droite. Bouton principal
    `Commencer la tournée`, puis deux secondaires `Tâches · 4` et `Météo · 24°`.
- Les quatre liens d'export/restauration en bas restent `text-12 text-ink-secondary`, inchangés.

### 4. `src/features/vue-ensemble/VueEnsemble.jsx`
- `<header>` (retour « ← Ruchers », titre, chip hors ligne, lien Modifier) → `EnTeteEcran`,
  avec `droite` = chip hors ligne, et `progression` = colonies visitées ce jour / total
  (calcul local à l'affichage, aucun champ nouveau — `derniereVisite.date === aujourd'hui`).
- La liste conserve `bg-surface` + filets `divide-rule`, **sans** conteneur arrondi visible :
  filets pleine largeur (`border-t`/`border-b` sur la liste, pas de `rounded`).
- Le bloc « urgences » dupliqué en haut d'écran est supprimé : la ligne urgente est déjà
  distinguée dans la liste (fond `bg-urgent-bg`, badge inversé, note visible), et le bandeau
  affiche le compte. Cela retire une redondance et libère la hauteur nécessaire pour voir
  cinq colonies sans défilement (critère d'acceptation n°7 du brief).
- Bouton principal `Saisir une visite` (h-[46px] `bg-ink`) épinglé en bas, au-dessus de la
  navigation, séparé par un filet `border-rule`.
- `Tournée vocale`, `+ Ruche`, `Importer l'historique CSV` : conservés, en secondaires/tertiaires.

### 5. `src/features/vue-ensemble/LigneColonie.jsx`
Structure et logique **inchangées** (appui long, ligne entière cliquable, distinction `—`/`0`,
note limitée à Action/Urgent). Ajustements visuels uniquement :
- hauteur mini 64px sans note, 88px avec note (déjà en place) ;
- badge numéro 28px, `font-mono text-13 font-bold` ; urgent → `bg-urgent-ink text-surface` ;
- en état urgent la pastille passe en `bg-surface text-urgent-ink` (au lieu de `bg-urgent-bg`),
  pour rester lisible sur la ligne teintée ;
- métriques `font-mono text-12`, `text-urgent-ink` sur ligne urgente, sinon `text-ink-secondary` ;
- note `text-12 italic`, une ligne, `truncate`, guillemets français.

### 6. Navigation
Deux options documentées, à trancher :
- **1c — barre d'onglets basse** (`src/components/BarreOnglets.jsx`) : 4 onglets
  `Rucher · Tâches · N · Météo · Registre`, hauteur 56px, `bg-surface`, filet haut
  `border-rule-strong`, onglet actif marqué par un **liseré haut 3px `bg-miel`** + libellé
  `text-ink font-bold` ; inactifs `text-ink-secondary`. Icônes : formes géométriques simples
  en encre (carré, cercle, losange, trois filets) — pas d'icône colorée en aplat, pas d'abeille.
  Implique de router `ecran` dans `App.jsx` par onglet plutôt que par pile ; le retour arrière
  en haut d'écran disparaît sur les écrans de premier niveau.
- **1d — fil de tournée** : voir ci-dessous.

### 7. Fil de tournée (optionnel, plus ambitieux)
Vue tournée en plein écran : colonne de 28px à gauche, jalons de 14px reliés par un filet 2px.
Jalon plein `bg-vert` = visitée (ligne à 55% d'opacité, heure de saisie en mono `text-vert`),
jalon creux bordé 3px `border-vert` = colonie courante (carte détaillée dépliée, boutons
`Saisir la visite` / `Passer`), jalon bordé 2px `border-rule-strong` = à venir (ligne compacte).
Geste : balayage vers la droite d'une ligne → panneau `bg-vert` révélé derrière, libellé
`✓ Visitée, rien à signaler` — enregistre une visite sans observation.
⚠️ Ce geste **crée un enregistrement de visite** : c'est le seul point de ce lot qui touche au
comportement. À valider avant implémentation.

### 8. `src/features/saisie-visite/SaisieVisite.jsx`
- En-tête → `EnTeteEcran` (retour `← Tournée`, titre `Ruche N`, contexte = ancienneté de la
  dernière visite).
- Compteurs : `Compteur.jsx` conservé, boutons portés de 40 à **44px** (critère n°6),
  valeur `font-mono text-20 tabular-nums`, `·` gris quand non observé, libellé de report
  `font-mono text-11 text-ink-muted` au format **`3 le 10/08`** (valeur + date courte fr-FR),
  identique pour tous les compteurs.
- Segmenté (`Segmente.jsx`) : hauteur 44px, actif `bg-ink text-surface`, reporté
  `bg-surface-sunk text-ink-muted` — logique inchangée. Légende sous le contrôle,
  `text-11 text-ink-muted`, décrivant la valeur choisie.
- Chips (`Chips.jsx`) : h-34px, `border-rule-strong`, sélectionné `bg-ink text-surface`.
- Note libre : `bg-surface-sunk`, bordure `rule-strong`, `text-13`, 72px, placeholder
  « Ce qui doit être relu à la prochaine visite ».
- Bas d'écran : un seul bouton principal `Enregistrer` (h-[46px] `bg-ink`), avec sous le bouton
  un compteur de durée `font-mono text-11 text-ink-muted` (`saisie en cours · N s`) —
  contrôle du critère « saisie sous la minute ».

### 9. Écrans restants
`TachesAFaire`, `Meteo`, `Historique*`, `Saisie*`, `ImportCsv`, `Restauration`,
`ExportSanitairePdf` : remplacer leur `<header>` + `BoutonRetour` par `EnTeteEcran`, garder
un seul bouton principal noir par écran, listes en lignes réglées. Aucun autre changement.

---

## Design Tokens (rappel, tous déjà dans le dépôt)
```
Fonds        --ground #FAFAF8 · --surface #FFFFFF · --surface-sunk #F3F3EF
Encre        --ink #1A1A17 · --ink-secondary #5C5C55 · --ink-muted #8A8A80
Traits       --rule #E3E2DC · --rule-strong #C9C8C0
États        urgent #FBEAE8/#8C1D18 · action #FCF0DC/#6B4106
             attente #F0EFEA/#44443E · normale #E4F2EA/#12543C
Structure    --miel #D89A2E · --vert #2B6E48 · --bordeaux #7A1830 · (--sur-miel #5C3E05)
Typo         Atkinson Hyperlegible (interface) · IBM Plex Mono (données, chiffres tabulaires)
Échelle      11 · 12 · 13 · 15 · 17 · 20 · 26 · (40 pour les chiffres héros de 1b)
Graisses     400 · 700 uniquement
Espacement   4 · 8 · 12 · 16 · 24 · 32
Rayon        6px · 0 sur les filets pleine largeur
Élévation    aucune — ni ombre, ni dégradé, ni flou
Cibles       44px minimum · 48px sur les contrôles de saisie
```

## Interactions & Behavior
- Ligne de colonie : toute la ligne ouvre la visite ; appui long 500ms sur le badge → mode
  réordonnancement (inchangé).
- Barre de progression : transition `width .35s ease` à l'enregistrement d'une visite.
- Enregistrement d'une visite : l'état de la ligne se recalcule (`src/lib/etats.js`, inchangé) ;
  message de confirmation `bg-normale-bg text-normale-ink`, `text-12 font-bold`, 8px/10px de
  padding, sous le bandeau.
- Aucune animation décorative ; aucun effet au survol (application tactile).

## State Management
Aucun état nouveau côté données. Deux états d'affichage locaux :
`progressionTournee` (dérivée des dates de dernière visite du jour) et `messageConfirmation`.

## Assets
Aucun. Les polices sont déjà servies en local via `@fontsource` (mode avion garanti).
Icônes de navigation : formes géométriques en encre, dessinées en CSS — aucun fichier à produire.

## Files
- `HAPPYBEE Refonte.dc.html` — les cinq options ; 1e est cliquable de bout en bout.
- Dépôt, à modifier : `src/components/EnTeteEcran.jsx` (nouveau),
  `src/components/BarreOnglets.jsx` (nouveau, si option 1c), `src/features/accueil/Accueil.jsx`,
  `src/features/vue-ensemble/VueEnsemble.jsx`, `src/features/vue-ensemble/LigneColonie.jsx`,
  `src/features/saisie-visite/SaisieVisite.jsx`, `src/components/Compteur.jsx`,
  `src/components/Segmente.jsx`, `src/styles/index.css`, `tailwind.config.js`.

## Question ouverte à trancher avant de coder
1. Accueil : **1a** (registre, encre seule sous le bandeau) ou **1b** (chiffres de saison dans
   le bandeau) ? **1b**
2. Navigation : garder la pile actuelle avec retour dans le bandeau, ou passer à la **barre
   d'onglets 1c** ? barre d'onglet
3. Le **fil de tournée 1d** et son balayage : dans ce lot, plus tard, ou pas du tout ? dans ce lot

## Ordre d'implémentation recommandé
1. `--sur-miel` + `EnTeteEcran`, appliqué à un seul écran. Capture avant / après.
2. Les six composants (§5 du brief d'origine), cibles tactiles vérifiées une par une.
3. `VueEnsemble` + `LigneColonie`.
4. `SaisieVisite`, chronomètre en main.
5. Écrans restants.
6. Revue : contraste ≥ 7:1 sur le texte principal, cinq colonies sans défilement, focus clavier.
