# Cadrage UX — L4, module économique

**Émetteur** : 2-UI · **Date** : 18/08/2026 · **Statut** : cadrage amont, avant maquettes.
**Sources** : `cahier_des_charges_v1_application_apicole.md` §2, §4.3, M6 (F6.1–F6.9) ;
`observation_cadre_et_cartographie_lots.md` partie B, L4 (L5.1–L5.12).

> **Rappel de périmètre.** L4 = **économique**. Le registre d'élevage est L5. L'inversion est
> actée au §21 du cahier des charges le 18/08/2026 ; les références `L5.x` de la cartographie
> sont conservées comme identifiants stables et ne suivent pas le renommage.

---

## 1. Le fait qui commande tout le reste

> §2, Contraintes, ligne « Appareils » :
> **« Téléphone (saisie terrain) + ordinateur (économique, exports) — synchronisés »**

**L4 est le premier lot destiné à l'ordinateur.** Tout ce qui a été construit jusqu'ici — et tout
le système de design de `brief_refonte_visuelle.md` — vise une main gantée, en plein soleil,
debout devant une ruche : cibles de 48 px, aucune saisie au clavier, cinq blocs par écran, tout
atteignable au pouce.

L'économique est l'exact inverse : travail assis, le soir, au clavier, avec des montants, des
tableaux et des comparaisons pluriannuelles. **Saisir une facture avec des compteurs `+`/`−`
serait absurde.**

Ce n'est pas une exception à demander : c'est une contrainte que Pierre a déjà posée et qu'aucun
lot n'avait encore exercée. Elle implique un **second registre d'interface**, même identité
visuelle, règles d'ergonomie distinctes :

| | Instrument de terrain (L1–L3bis) | Outil de bureau (L4) |
|---|---|---|
| Entrée | pouce, gants | clavier, souris |
| Cible tactile | 44–48 px minimum | **44 px conservés** (voir ci-dessous), densité gagnée ailleurs |
| Saisie texte | évitée | normale, c'est le mode principal |
| Densité | 5 blocs maximum | tableaux denses assumés |
| Enchaînement | un écran = un geste | saisie en série, tabulation entre champs |

**Précision d'arbitrage (18/08/2026) : « pensé pour l'ordinateur, mais utilisable au
téléphone ».** Ce n'est donc pas un module réservé au bureau. Conséquence concrète : on **ne
descend pas** les cibles tactiles sous 44 px, et rien ne dépend du survol ni du clic droit. La
densité se gagne sur les marges, la taille de police des tableaux et le nombre de colonnes
affichées — pas sur la taille des boutons. Chaque écran doit rester praticable en 375 px de large,
même si sa mise en page confortable en suppose davantage.

**Ce qui ne change pas** : jetons de couleur, typographie, langue, ton des messages, distinction
vide/zéro, « rien n'est enregistré sans geste explicite ». L'identité reste une, l'ergonomie se
dédouble.

---

## 2. Le pont téléphone → ordinateur

Une exigence échappe au bureau : **F6.4, photographier un justificatif**. On photographie une
facture avec le téléphone, on l'exploite à l'ordinateur. Le lot n'est donc pas purement sédentaire ;
il comporte un geste mobile isolé.

Conséquence de conception : la capture d'un justificatif doit rester utilisable sur téléphone,
indépendamment du reste du module. Le mécanisme existe déjà (`comprimerImage`,
`enregistrerPhoto`, capture `capture="environment"` dans l'écran de visite) — à réemployer, pas à
réinventer.

---

## 3. Le point dur : l'affectation analytique

C'est là que le lot se joue, et là que l'interface peut devenir incompréhensible.

Une écriture porte simultanément (§4.3, `ecriture`) : un **niveau d'affectation** (exploitation /
rucher / sélection libre de ruches), une **clé de répartition** parmi quatre (égale / prorata
production / prorata nombre de ruches / manuelle), et une **nature** (charge directe / indirecte /
investissement amortissable / produit). Trois dimensions indépendantes, sur un même formulaire,
qui déterminent ensuite un éclatement en `ecriture_affectation`, une ligne par ruche.

Difficultés à traiter en conception :

1. **Les combinaisons n'ont pas toutes un sens.** Une clé de répartition n'a d'objet que si le
   niveau vise plusieurs ruches. L'interface doit faire disparaître ce qui n'a pas lieu d'être
   plutôt que le désactiver en gris — même principe que le sélecteur de rucher de destination,
   qui n'apparaît que sur un mouvement de transhumance.
2. **La clé « prorata production » se recalcule** (L5.4) quand la production change. L'exploitant
   doit pouvoir comprendre qu'un montant affecté hier a bougé aujourd'hui, sans avoir à le
   déduire. Un montant qui change tout seul sans explication détruit la confiance dans le chiffre.
3. **Le mode manuel exige une somme à 100 %.** Le précédent existe déjà dans l'application :
   `SaisieRecolte.jsx` (pesée globale répartie) affiche « Total : N % (doit faire 100 %) » en
   rouge tant que le compte n'y est pas. **Reprendre ce patron tel quel** plutôt qu'en inventer un
   second.
4. **L'éclatement doit être visible avant validation.** Répartir 400 € sur neuf ruches produit
   neuf lignes : l'exploitant doit voir le résultat avant d'enregistrer, pas le découvrir après.

---

## 4. La saisie est un journal, pas un formulaire

F6.1 décrit une écriture unitaire, mais l'usage réel est la saisie **en série** : on vide une
pile de factures. Le formulaire de visite est conçu pour une saisie unitaire soignée ; celui-ci
doit être conçu pour l'enchaînement.

Implications : report du dernier tiers et de la dernière catégorie saisis (comme la visite reporte
la précédente), enchaînement complet au clavier sans passer par la souris, et retour immédiat sur
un formulaire vierge après enregistrement plutôt qu'un écran de confirmation à franchir.

---

## 5. Inventaire prévisionnel des écrans

Déduit de F6.1–F6.9, à confirmer par le cahier des charges fonctionnel de 1-SPEC :

| Écran | Couvre | Registre |
|---|---|---|
| Journal des écritures (liste + filtres exercice/sens/catégorie) | F6.1 | bureau |
| Saisie d'une écriture, avec affectation et répartition | F6.1–F6.3 | bureau |
| Capture d'un justificatif | F6.4 | **mobile** |
| Immobilisations et dotations annuelles | F6.5 | bureau |
| Tableau de bord (coût de revient/kg, marge, contribution, seuil) | F6.6 | bureau |
| Comparaison pluriannuelle | F6.9 | bureau |
| Coût cumulé d'une colonie perdue | F6.7 (S) | bureau |

**Réemploi identifié** : `RendementRecolte.jsx` établit déjà le patron du tableau pluriannuel
(lignes = ruches, colonnes = années, colonne Total, défilement horizontal contenu). F6.9 doit le
reprendre plutôt que créer une seconde grammaire de tableau.

---

## 6. Arbitrages — état au 18/08/2026

1. **Chiffres en héros — TRANCHÉ, autorisé.** Les résultats de calcul de F6.6 (coût de revient au
   kg, marge, contribution, seuil de rentabilité) **s'affichent en grand**. L'interdit de
   `brief_refonte_visuelle.md` §2/§10 visait des chiffres décoratifs sur un écran d'action au
   rucher, pas des résultats d'analyse sur un écran de bureau. Il ne s'applique donc pas à L4.
   *(Arbitrage Pierre, 18/08/2026.)*

2. **Exercice comptable — TRANCHÉ : campagne apicole (avril–mars)**, pas année civile.
   *(Arbitrage Pierre, 18/08/2026.)*

   **Conséquence pour 3-BUILD : l'outil existe déjà, ne pas en écrire un second.**
   `src/lib/saison.js` → `obtenirSaison(dateIso)` renvoie `{ debut, label: "2026-2027" }` et
   implémente exactement cette règle depuis un arbitrage du 14/08/2026 (« hivernage à hivernage,
   plus proche du cycle réel de la colonie qu'une année civile »). Le champ `exercice` du modèle
   `ecriture` doit s'appuyer dessus, et l'`amortissement_annuel` suivre la même borne.

3. **Point d'entrée — TRANCHÉ : la tuile « Économique » de l'accueil**, pas un onglet.
   *(Arbitrage Pierre, 18/08/2026, sur la recommandation ci-dessous.)*

4. **Export sanitaire — TRANCHÉ : l'année civile est maintenue, pour un motif légal.**
   Ce n'est donc **pas** une divergence à corriger. *(Arbitrage Pierre, 18/08/2026.)*

   **Action pour 3-BUILD, hors lot L4** : le commentaire de `ExportSanitairePdf.jsx` dit
   aujourd'hui « ici l'année civile **faute d'un exercice défini ailleurs dans le modèle** » —
   il présente comme un pis-aller technique ce qui est une obligation légale. À réécrire pour
   dire la vraie raison, sinon quelqu'un « corrigera » un jour cette année civile en croyant
   réparer un oubli, et cassera une conformité réglementaire.

---

### Recommandation sur le point d'entrée : la tuile, pas un onglet *(retenue)*

La barre d'onglets compte trois onglets (Rucher, Tâches, Météo) et avait été dimensionnée pour
quatre. La place existe donc techniquement. Je recommande malgré tout de **ne pas l'y mettre** :

- **La barre d'onglets est la navigation de l'instrument de terrain.** Elle est en bas, à portée
  de pouce, et porte ce dont on a besoin debout devant une ruche. Y loger un module de bureau
  mélange les deux registres que §1 de cette note sépare — et consomme une place permanente sur
  l'écran le plus consulté au profit d'un usage du soir.
- **Une barre d'onglets basse est elle-même un idiome mobile.** Sur l'ordinateur, cible déclarée
  de L4, ce n'est de toute façon pas la bonne navigation.
- **La tuile existe déjà** sur l'accueil, en « à venir » (§602 du cahier des charges), et
  l'accueil est précisément l'écran sur lequel on arrive quand on s'assied avec l'application.
  La découvrabilité est donc acquise, sans rien coûter au terrain.

### Point relevé en marge, hors périmètre L4

`ExportSanitairePdf.jsx` propose par défaut l'**année civile** (`premierJanvier()`), avec ce
commentaire : « par défaut l'exercice en cours, ici l'année civile **faute d'un exercice défini
ailleurs dans le modèle** ». Cette prémisse était déjà fausse le 14/08 (`saison.js` existe depuis)
et l'est doublement depuis l'arbitrage d'aujourd'hui.

À arbitrer, hors de ce lot : soit l'export sanitaire s'aligne sur la campagne apicole comme le
reste de l'application, soit l'année civile y est **délibérée** pour un motif réglementaire — ce
que le commentaire ne dit pas. En l'état c'est une divergence par défaut, pas par décision.

---

## 7. Ce que j'attends de 1-SPEC

Le cahier des charges fonctionnel, en particulier : les quatre clés de répartition et leurs règles
exactes de recalcul (L5.4), le mode de génération des dotations (L5.6), et les formules des
indicateurs de F6.6 — le cahier des charges esquisse un calcul de coût de revient autour de la
ligne 421, à confirmer comme la référence.

Je peux avancer sans cela sur les registres d'interface, la grammaire des écrans et le patron
d'affectation ; pas sur les libellés ni les règles de calcul.
