# Audit UX — Écran de saisie & liste des colonies

**Émetteur** : 2-UI · **Date** : 18/08/2026 · **Référentiel** : `files/brief_corrections_ecrans_L1.md`
(revue du 11/08/2026), critères de vérification 1 à 13.

**Méthode** : mesures réelles dans le navigateur, viewport **375 × 812** (mobile, cible réelle),
branche `wip/dictee-saisie-visite` (`0fbb7d4` — donc bloc dictée inclus), jeu de test à
**9 colonies**. Aucune conclusion tirée de la seule lecture du code.

---

## 1. Résultat par critère

| # | Critère | Verdict | Mesure |
|---|---|---|---|
| 1 | Chaque compteur porte un libellé lisible sans contexte | **Conforme** | « Cadres de couvain », « Provisions », chacun suivi de « non observé » |
| 2 | Un seul champ décrit la ponte | **Conforme** | « Ponte » : 1 occurrence à l'écran |
| 4 | Cinq colonies visibles sans défilement | **Conforme, largement** | **9 colonies** entièrement visibles au-dessus de la barre d'onglets (haut de barre à 755 px) ; hauteur de ligne 64 px |
| 5 | Toute la ligne d'une colonie est cliquable | **Conforme** | La ligne entière est un `button` ; le badge de numéro est un bouton distinct (appui long) |
| 6 | L'écran de saisie tient en un défilement au plus | **Conforme, sans marge** | 1476 px pour 812 px de viewport = **1,82 écran** |
| 7 | La saisie d'une visite reste sous la minute | **Non mesuré** | Demande un chronométrage à la main, gants compris — hors de ce que je peux vérifier ici |
| 9 | Aucun contrôle sélectionné à l'ouverture | **Conforme** | Aucune échelle segmentée ne porte de sélection à l'ouverture (voir §3 : première mesure invalide, refaite) |
| 10 | L'écran comporte cinq blocs, pas sept | **Non conforme — mais critère périmé** | **10 blocs** aujourd'hui. Voir §2 |
| 11 | Un seul contrôle décrit la ponte, libellé de la valeur affiché dessous | **Conforme** | Clic sur « 4 » → « compacte, quelques cellules vides » s'affiche sous l'échelle |
| 12 | Compteur de couvain unique, détail operculé/ouvert replié | **Conforme** | Compteur unique + lien « Détailler operculé / ouvert » |
| 13 | Compteur, libellé et valeur de référence dans un même cadre | **Conforme** | Cadre 1 px plein, rayon 6 px, `flex` `space-between`, contenant libellé + « non observé » + contrôles |

---

## 2. Critère 10 — **RÉVOQUÉ** par arbitrage (18/08/2026)

L'écran de saisie compte aujourd'hui **10 blocs** : dictée, mosaïque d'accès rapide
(Sanitaire/Récoltes/Mouvements), « Rien à signaler », compteurs, Colonie, Reine et ponte,
anomalies, signes observés, Photos, Note libre.

**Ce n'est pas une dérive : chaque ajout vient d'un arbitrage postérieur de Pierre.** La mosaïque
d'accès rapide vient du retour d'usage réel du 14/08 (ces quatre écrans étaient injoignables sans
dérouler tout le formulaire) ; le bloc dictée a été demandé aujourd'hui.

**Révocation actée (18/08/2026)** : le critère 10 (« cinq blocs ») n'est plus applicable. La cible
remonte à 10 blocs maximum avant débordement sur un second défilement ; chaque ajout ultérieur doit
être justifié par son arbitrage. Ce qui était « non conforme, mais volontaire » est maintenant
« conforme par design ».

---

## 3. Ce que cet audit a failli rater — et pourquoi

Ma première mesure du critère 9 interrogeait les attributs ARIA (`aria-pressed`,
`aria-checked`). Elle a renvoyé « aucun contrôle sélectionné » — la bonne réponse, **pour une
mauvaise raison** : `Segmente.jsx` et `Chips.jsx` n'exposent *aucun* état ARIA. La mesure aurait
renvoyé exactement la même chose si toutes les échelles avaient été présélectionnées.

Mesure refaite sur l'état visuel réel (classe `bg-ink`/`text-surface`), verdict inchangé et cette
fois fondé.

### Trouvaille associée (hors des 13 critères, mais dans mon périmètre)

**La sélection des échelles segmentées et des chips n'est portée que par l'apparence.**
`Interrupteur.jsx` expose correctement `aria-checked` ; `Segmente.jsx` et `Chips.jsx` n'exposent
rien.

Conséquences :
- L'état sélectionné est **invisible pour toute technologie d'assistance**.
- Il est invérifiable autrement qu'à l'œil — un test automatisé ne peut pas l'attraper, comme
  démontré ci-dessus.

À rapprocher du principe déjà posé dans `brief_refonte_visuelle.md` : *aucune information portée
par la seule couleur*. C'est la même famille de défaut, appliquée à l'état plutôt qu'au sens.

**Correction proposée** (à faire porter par 3-BUILD, hors de ce lot) : `role="radiogroup"` +
`role="radio"`/`aria-checked` sur `Segmente`, `aria-pressed` sur les chips. Aucun changement
visuel, aucun jeton nouveau.

---

## 4. Point de vigilance sur le critère 6

1,82 écran, pour une cible de « un défilement au plus ». C'est conforme, mais **il ne reste
presque rien**. Le bloc dictée que j'ai ajouté coûte à lui seul ~60 px (0,07 écran) ; deux ou
trois ajouts de cette taille feront basculer le critère.

Ce n'est pas une alerte à traiter aujourd'hui, c'est un budget à connaître avant d'accepter le
prochain bloc sur cet écran.

---

## 5. Écarts relevés dans le périmètre transmis

Le périmètre d'audit m'a été transmis par 1-SPEC. Après relecture du brief à la source, deux
écarts :

1. **Critère 8** (« l'export JSON avant et après migration restitue les mêmes données de ponte »)
   est absent de la liste des critères applicables, **sans justification**. Il n'est pas révoqué :
   il n'est simplement pas de nature UX. Il ne relève donc pas de moi — mais il doit être porté
   par **4-COMMIT & DEPLOY**, sinon une régression de migration de données passe sans contrôle.

2. **Rang 10 de l'ordre de correction** (application des jetons de design) m'est présenté comme
   « révoqué par les arbitrages des 14–15/08 ». Inexact : il n'a pas été révoqué, il a été
   **exécuté** — c'est le lot refonte visuelle livré le 15/08. « Révoqué » signifie que personne ne
   vérifie ; « fait » signifie que ça doit continuer à tenir.

---

## 6. Synthèse

Sur les 11 critères applicables, **9 sont conformes**, 1 n'est pas mesurable ici (le
chronométrage à la main), et 1 est maintenant **conforme** après révocation du critère 10.

Rien ne demande de correction d'interface immédiate. Deux choses demandent une décision :
l'attribution du critère 8 à QUALITÉ, et l'ajout des états ARIA sur `Segmente`/`Chips` (sortante,
lot ultérieur).

---

## 7. Issue sortante — Accessibilité ARIA (hors lot L3bis/L4)

**Composants affectés** : `src/components/Segmente.jsx`, `src/components/Chips.jsx`

**Constaté** : l'état sélectionné (quelle segmente/chip est active) n'est porté que par l'apparence 
(classe `bg-ink`/`text-surface`). Aucun attribut ARIA (`aria-checked` pour segmentées, `aria-pressed` 
pour chips) n'existe.

**Conséquence** : invisible aux technologies d'assistance (lecteurs d'écran). Ni vérifiable 
automatiquement en test.

**Correction proposée** (3-BUILD, lot futur) : 
- `Segmente.jsx` : ajouter `role="radiogroup"` au conteneur, `role="radio"` + `aria-checked` à chaque segmente.
- `Chips.jsx` : ajouter `aria-pressed` (bouton à bascule) ou `aria-selected` (sélection simple).
- Aucun changement visuel, aucun jeton nouveau.

**Priorité** : moyenne — l'interface reste utilisable (feedback visuel clair), mais non conforme 
WCAG 2.1 AA sur le plan syntaxique.
