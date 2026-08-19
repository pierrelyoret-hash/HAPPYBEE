# Cahier des charges fonctionnel — L4 Économique (M6)

**Rédigé par** 1-SPEC — 18/08/2026 · **À valider par l'exploitant avant tout développement**
**Sources** `cahier_des_charges_v1_application_apicole.md` §4.3 (modèle), §5 F6.1-F6.9
(exigences), §6.2 (répartition analytique), §6.5 (coût de revient) ·
`observation_cadre_et_cartographie_lots.md`, section L4 (références `L5.x` conservées)
**Séquence** L3bis (en cours) → **L4 économique** → L5 registre → L6

---

## 1. Objectif

Tenir la comptabilité de l'exploitation — dépenses, produits, immobilisations — et **affecter
chaque montant au bon niveau analytique** (exploitation, rucher, ruches), pour aboutir au seul
indicateur qui justifie tout l'édifice : **le coût de revient au kilo de miel, ruche par
ruche**.

C'est le module qui distingue l'application du marché : le §0 du cahier des charges pose que
les outils existants « ne couvrent pas l'analytique par ruche ».

## 2. Ce que ce lot change, au-delà des fonctionnalités

**L4 fait entrer l'ordinateur dans le projet.** Jusqu'ici, la règle transverse était « aucune
interface ordinateur avant L4 » et tout se passait sur le téléphone. Le §2 du cahier des
charges assigne explicitement l'économique et les exports à l'ordinateur.

Conséquence de conception : **les écrans de ce lot ne sont pas des écrans de terrain.** Ils ne
sont pas soumis aux contraintes « gants aux mains, en plein soleil, sous la minute » qui ont
façonné la saisie de visite. Ils sont soumis à d'autres : saisie de nombres au clavier,
tableaux comparatifs denses, lecture longue. Reprendre tels quels les composants tactiles du
terrain serait un contresens — et l'inverse aussi : la saisie d'une dépense doit rester
possible depuis le téléphone, facture en main, au retour du fournisseur.

Cible retenue : **écrans utilisables sur les deux, pensés pour l'ordinateur.**

---

## 3. Arbitrages actés — 18 août 2026

*Les trois points ci-dessous ont été tranchés par l'exploitant, conformément aux propositions
formulées. Le brief est exécutable en l'état.*

### 3.1 `exercice` : année civile ou campagne apicole ? — **structurant, risque d'indicateurs faux**

**Le conflit.** Le modèle §4.3 définit `ecriture.exercice` comme une **année**, et §6.5 calcule
`coût_de_revient_kg(ruche, exercice)` en divisant les charges de l'exercice par les kilos
produits sur ce même exercice.

Mais l'arbitrage du **14/08/2026** (§16, retour d'usage réel) a défini la saison comme la
**campagne apicole d'avril à mars**, « hivernage à hivernage, plus proche du cycle réel de la
colonie que le calendrier ». C'est implémenté (`src/lib/saison.js`) et c'est déjà ce qui
regroupe les récoltes et l'historique consolidé.

**Le risque, s'il n'est pas tranché.** Le numérateur (charges) et le dénominateur (kilos) ne
porteraient pas sur la même période. Le nourrissement d'automne 2026 et la récolte d'été 2026
tomberaient dans la même année civile, alors qu'ils appartiennent à deux campagnes
différentes ; à l'inverse, le nourrissement de septembre qui prépare la récolte de l'été
suivant serait imputé à la mauvaise production. **Le coût de revient serait faux sans que rien
ne le signale** — exactement le défaut que §6.2 qualifie de « faux et impossible à
diagnostiquer ».

**Décision actée : l'exercice suit la campagne apicole avril-mars**, comme tout le reste de
l'application. `ecriture.exercice` stocke l'année de début de campagne (2026 = campagne
2026-2027), et réutilise `obtenirSaison()` plutôt que d'introduire une seconde notion de
période.

**Réserve à connaître** : si une structure fiscale est créée un jour, l'exercice fiscal sera
probablement l'année civile. Le principe 4 du cahier des charges (« prêt pour un cadre fiscal,
non activé ») demande de capter les champs sans activer les exports. La parade est de
**stocker la date de l'écriture**, à partir de laquelle les deux découpages restent
calculables — ce que le modèle fait déjà. Aucune donnée n'est perdue par ce choix.

### 3.2 Que signifie « clôture de l'exercice » ?

§6.2 prescrit que l'affectation « est recalculée à la clôture de l'exercice, et à chaque
nouvelle récolte enregistrée ». Or **aucune notion de clôture n'existe dans l'application**, ni
dans le modèle ni dans le code.

**Décision actée : ne pas en introduire.** Le recalcul se déclenche sur événement — à chaque
récolte enregistrée, modifiée ou supprimée, et à chaque écriture créée ou modifiée en clé
« prorata production ». Une clôture explicite ajouterait un geste rituel que l'exploitant
oubliera, et des indicateurs figés à tort. L'horodatage `calcule_le` reste la trace du dernier
recalcul, comme prévu.

### 3.3 F6.8 — extraction IA des justificatifs

L'exigence est de priorité **C** (could) et suppose le réseau.

**Décision actée : hors de L4, renvoyée en L6** avec le reste de la couche IA — même
traitement que pour L3bis (§21). La saisie manuelle du montant, de la date et du fournisseur
reste rapide ; la photo du justificatif, elle, est bien dans ce lot (F6.4).

---

## 4. Périmètre

### Dans L4

| Réf | Fonctionnalité | Prio |
|---|---|---|
| L5.1 | Écritures dépenses et produits, tous les champs du modèle | M |
| L5.2 | Affectation exploitation / rucher / sélection libre de ruches | M |
| L5.3 | Quatre clés de répartition | M |
| L5.4 | Recalcul dynamique des clés dépendant de la production | M |
| L5.5 | Justificatifs photographiés, rattachés à l'écriture | M |
| L5.6 | Immobilisations et dotations annuelles | M |
| L5.7 | **Coût de revient au kg par ruche** | M |
| L5.8 | Marge, contribution au résultat, seuil de rentabilité | M |
| L5.9 | Comparaison pluriannuelle | S |
| L5.10 | Coût cumulé d'une colonie perdue | S |
| L5.12 | Champs fiscaux captés, exports désactivés | M |

### Explicitement hors de L4

- **L5.11 / F6.8** — extraction IA des justificatifs (§3.3), renvoyée en L6.
- **Tout export fiscal** — livre de recettes micro-BA, distinction production propre / négoce.
  Le champ `origine_production` est **capté et stocké, jamais affiché ni exporté** (principe 4
  du cahier des charges, et §12 exclusions actées). Aucun écran ne le présente comme utile.
- **TVA, déclarations, liasse** — hors périmètre V1, jamais spécifiés.
- **Multi-devise, multi-exploitation** — un seul utilisateur, un seul euro.
- **Rapprochement bancaire, import de relevés** — jamais spécifiés, non ajoutés.
- **Suivi des quantités vendues** *(arbitrage du 18/08/2026)* — aucune quantité n'est ajoutée
  aux écritures de vente. L'application connaît les kilos **produits** (par les récoltes),
  jamais les kilos **vendus**. Conséquence assumée sur le seuil de rentabilité : voir §6.5.
- **Amortissement dégressif** — le modèle ne prévoit que `mode` (linéaire).

---

## 5. Modèle de données

Repris **tel quel** du §4.3, aucune invention. Champs communs habituels (`id`, `created_at`,
`updated_at`, `deleted_at`), suppression logique uniquement.

**`categorie`** — `libelle`, `sens` (dépense | produit), `groupe`
> Groupes dépense : cheptel, matériel, intrants sanitaires, nourrissement, conditionnement,
> déplacement, formation, assurance, cotisations, divers.
> Groupes produit : vente miel, vente cire, vente essaims, prestation, aide, don.
> **À pré-remplir au premier lancement** : une liste vide oblige à créer une catégorie avant
> la première écriture, ce qui décourage la saisie dès le premier geste.

**`tiers`** — `nom`, `type` (fournisseur | bénéficiaire), `notes`

**`ecriture`** — `date`, `libelle`, `sens`, `montant`, `categorie_id`, `tiers_id`,
`mode_reglement` (espèces | chèque | virement | carte), `justificatif_document_id`,
`niveau_affectation` (exploitation | rucher | ruches), `rucher_id`, `cle_repartition`
(égale | prorata_production | prorata_nb_ruches | manuelle), `nature` (charge_directe |
charge_indirecte | investissement_amortissable | produit), `immobilisation_id`, `exercice`,
`origine_production`

**`ecriture_affectation`** — une ligne par ruche concernée
`ecriture_id`, `ruche_id`, `quote_part_pct`, `montant_calcule`, `calcule_le`

**`immobilisation`** — `libelle`, `date_acquisition`, `valeur_acquisition`,
`duree_amortissement_annees`, `mode` (linéaire), `date_sortie`, `valeur_residuelle`,
`justificatif_document_id`

**`amortissement_annuel`** — généré — `immobilisation_id`, `exercice`, `dotation`,
`cle_repartition`

### À réutiliser, à ne pas reconstruire

- **`document`** existe depuis L2.2 (schéma minimal : type, date, fichier, libellé, entité
  liée). Le justificatif de F6.4 s'y rattache via `justificatif_document_id` — c'est déjà la
  mécanique de l'ordonnance rattachée à un traitement.
- **`ruche.immobilisation_id`** existe déjà dans le code (`src/db/repositories/ruches.js`),
  posé à `null`. Le lien ruche ↔ immobilisation est pré-câblé.
- **La compression de photo** (`src/lib/compressionImage.js`) est en place et sert déjà aux
  photos de visite.
- **`obtenirSaison()`** (`src/lib/saison.js`) définit la campagne apicole — à réutiliser pour
  l'exercice, sous réserve de l'arbitrage §3.1.

---

## 6. Règles de calcul

### 6.1 Répartition analytique (§6.2 du cahier des charges, repris à l'identique)

```
Clé « égale »               → montant / nombre de ruches sélectionnées
Clé « prorata production »  → montant × (kg_ruche / kg_total_sélection)
Clé « prorata nb ruches »   → montant / nombre de ruches actives sur la période
Clé « manuelle »            → pourcentages saisis, contrôle de somme = 100 %
```

Précisions nécessaires, absentes du cahier des charges et à ne pas laisser au hasard :

- **« Ruches actives sur la période »** = ruches dont le `statut` est `active` à un moment
  quelconque de l'exercice, rattachées au niveau d'affectation retenu. Une ruche réformée en
  cours d'exercice compte : elle a bien porté une part des charges.
- **Clé manuelle, somme ≠ 100 %** : la somme est **affichée en permanence** pendant la saisie
  et l'écart signalé, mais **jamais bloquante** — aucun champ n'est obligatoire nulle part dans
  l'application, et une saisie bloquée produit un contournement, donc une donnée fausse.
- **Division par zéro** : si la sélection ne contient aucune ruche, ou si `kg_total_sélection`
  vaut 0 en clé « prorata production », **aucune affectation n'est écrite** et l'écriture reste
  au niveau supérieur, signalée comme non affectée. Ne jamais écrire `0` ni `NaN`.

### 6.2 Recalcul des clés dépendant de la production — **le point le plus délicat du lot**

§6.2 le qualifie de « subtilité déterminante » : la clé « prorata production » n'est pas
calculable au moment de la saisie, puisque la récolte n'a pas encore eu lieu.

**Déclencheurs du recalcul** (sous réserve de l'arbitrage §3.2) : toute récolte enregistrée,
modifiée ou supprimée sur l'exercice, et toute écriture créée ou modifiée en clé
« prorata production ».

**Portée** : toutes les écritures de l'exercice en clé « prorata production », pas seulement la
dernière. Une récolte tardive change la répartition de toutes les charges de la campagne.

`calcule_le` est mis à jour à chaque recalcul, et **l'interface affiche cette date** partout où
un montant réparti est présenté. Un chiffre dont on ignore l'âge est un chiffre auquel on ne
peut pas se fier.

### 6.3 Coût de revient (§6.5, repris à l'identique)

```
coût_de_revient_kg(ruche, exercice) =
    ( charges_directes_affectées
    + quote-part_charges_indirectes
    + dotations_amortissement_affectées )
    / kg_produits(ruche, exercice)
```

Précisions nécessaires :

- **`kg_produits(ruche, exercice)`** se calcule en remontant la chaîne `recolte.colonie_id →
  colonie.ruche_id`. **Une ruche peut héberger plusieurs colonies successives dans un même
  exercice** (mortalité puis repeuplement, transvasement) : il faut sommer la production de
  **toutes** les colonies qui l'ont occupée. Ne sommer que la colonie courante produirait un
  coût de revient artificiellement élevé sur toute ruche ayant connu un accident — précisément
  les ruches qu'on veut analyser.
- **Production nulle** : si `kg_produits` vaut 0, le coût de revient n'est **pas** affiché comme
  infini ni comme zéro, mais comme **« non calculable — aucune production »**, avec le total
  des charges portées. Une ruche qui a coûté sans rien produire est une information utile ; un
  ratio infini n'en est pas une.
- **Affichage** : §6.5 impose que le coût de revient soit « systématiquement accompagné de la
  série pluriannuelle », parce qu'« un ratio isolé sur trois colonies n'a pas de valeur
  statistique ». L'interface ne doit donc **jamais afficher un chiffre unique isolé** qui
  suggérerait une précision inexistante.

### 6.4 Amortissements

Dotation linéaire : `valeur_acquisition / duree_amortissement_annees`, générée par exercice
dans `amortissement_annuel`, de l'acquisition jusqu'au terme ou à `date_sortie`. Prorata
temporis sur l'exercice d'acquisition et sur celui de sortie.

La dotation d'un exercice se répartit entre ruches selon `amortissement_annuel.cle_repartition`,
avec les mêmes quatre clés qu'une écriture (§6.1) — une immobilisation rattachée à une ruche
précise via `ruche.immobilisation_id` s'affecte directement à elle, sans clé.

### 6.5 Indicateurs du tableau de bord (F6.6)

**F6.6 nomme quatre indicateurs mais le cahier des charges n'en définit qu'un** — le coût de
revient (§6.5). Les trois autres n'avaient de formule nulle part. Les définitions ci-dessous,
proposées par 1-SPEC, ont été **validées par l'exploitant le 18/08/2026** ; elles sont
volontairement les plus simples qui répondent à la question posée.

Base commune, identique au numérateur du coût de revient :
```
charges_totales(ruche, exercice) = charges_directes_affectées
                                 + quote-part_charges_indirectes
                                 + dotations_amortissement_affectées
```

**Marge par ruche**
```
marge(ruche, exercice) = produits_affectés(ruche, exercice) − charges_totales(ruche, exercice)
```
En euros, jamais en ratio. C'est l'indicateur le plus lisible du lot : il répond à « cette
ruche m'a-t-elle rapporté ou coûté ? » sans supposer aucune convention.

**Contribution au résultat**
```
résultat(exercice)     = Σ produits − Σ charges, sur tout l'exercice
contribution(ruche)    = marge(ruche) / résultat(exercice)      → en %
```
**Cas à traiter, sinon l'indicateur ment** : si `résultat(exercice)` est nul ou négatif, le
pourcentage n'a aucun sens (une ruche rentable afficherait une contribution négative). Dans ce
cas, **n'afficher que la marge en euros**, avec la mention « résultat d'exploitation négatif —
contribution non calculable ».

**Seuil de rentabilité** — au niveau de l'exploitation, **pas par ruche**. Le §6.5 avertit
qu'« un ratio isolé sur trois colonies n'a pas de valeur statistique » ; un seuil par ruche
serait du bruit.

**Décision actée (18/08/2026)** : la première expression est l'**indicateur principal**, la
seconde vient en second avec son hypothèse affichée, et **le suivi des quantités vendues reste
hors périmètre** — l'indicateur ne justifie pas d'alourdir la saisie d'une vente.

Deux expressions, la première étant la principale car elle ne suppose rien :
```
prix_de_vente_minimum_au_kg = charges_totales(exercice) / kg_produits_total(exercice)
```
C'est le prix en dessous duquel l'exploitation perd de l'argent — et c'est aussi, par
construction, le coût de revient global.

```
kg_à_vendre_pour_équilibrer = charges_totales(exercice) / prix_moyen_de_vente_au_kg
avec prix_moyen_de_vente_au_kg = produits_« vente miel » / kg_produits_total
```
> **Hypothèse à signaler dans l'interface** : ce second calcul suppose que **tout le miel
> produit sur l'exercice est vendu sur ce même exercice**. L'application ne suit aucun stock —
> la gestion de stock est explicitement hors périmètre depuis L2.2 — donc les kilos vendus ne
> sont pas connus, seuls les kilos produits le sont. Si une part notable de la production est
> stockée, donnée ou consommée, ce chiffre dérive. La première expression, elle, reste juste
> en toutes circonstances.

**Contrainte d'affichage commune à tous ces indicateurs** (§6.5) : jamais un chiffre unique
isolé, toujours accompagné de la série pluriannuelle. Sur trois à trente colonies, un ratio
présenté seul suggère une précision qui n'existe pas.

---

## 7. Écrans

Écrans de bureau d'abord, utilisables sur téléphone (§2). Jetons de design existants ; les
choix visuels propres à ce lot reviennent à **2-UI**, qui travaille en parallèle.

- **Saisie d'une écriture** — le parcours principal, à optimiser. Dépense ou produit, montant,
  date, catégorie, tiers, puis affectation. **L'affectation ne doit pas être un second
  formulaire** : niveau et clé tiennent sur une ligne chacun, la sélection de ruches n'apparaît
  qu'au niveau « ruches ». Photo du justificatif en un geste.
- **Liste des écritures** — filtrable par exercice, sens, catégorie, rucher. Lignes réglées,
  montants en chiffres tabulaires, comme l'historique existant.
- **Immobilisations** — liste, fiche, échéancier des dotations.
- **Tableau de bord** (L5.7, L5.8) — coût de revient au kg par ruche, marge par ruche,
  contribution au résultat, seuil de rentabilité. **Toujours avec la série pluriannuelle**
  (§6.3).
- **Comparaison pluriannuelle** (L5.9, priorité S) — par ruche et par poste.
- **Coût cumulé d'une colonie perdue** (L5.10, priorité S) — à rattacher à la fiche colonie
  existante plutôt qu'à un écran neuf.

Règles transverses inchangées : **aucun champ obligatoire**, suppression logique uniquement,
corbeille consultable, fonctionnement hors-ligne intégral (aucun calcul de ce lot n'exige le
réseau).

---

## 8. Ordre de travail

Chaque étape validée avant la suivante.

1. **Schéma** (six tables), migration non destructive, vérification par export JSON avant/après.
2. **Catégories pré-remplies** + écran des tiers.
3. **Saisie d'une écriture** au niveau exploitation uniquement, sans répartition — le parcours
   le plus fréquent doit être bon avant d'ajouter l'analytique.
4. **Affectation et quatre clés de répartition**, hors « prorata production ».
5. **Clé « prorata production » et moteur de recalcul** (§6.2) — l'étape la plus délicate, à
   isoler et à tester sur un cas réel à deux récoltes.
6. **Immobilisations et dotations.**
7. **Coût de revient** et tableau de bord, avec série pluriannuelle.
8. **Priorités S** : comparaison pluriannuelle, coût d'une colonie perdue.
9. **Non-régression** : aucun écran existant modifié, export JSON complet.

---

## 9. Critères d'acceptation

1. Une dépense se saisit et s'affecte à l'exploitation en moins de trente secondes.
2. Une charge répartie entre trois ruches par clé égale produit trois affectations dont la
   somme égale exactement le montant d'origine, au centime près.
3. Une charge en clé « prorata production » **se recalcule seule** à l'enregistrement d'une
   nouvelle récolte, et `calcule_le` est mis à jour.
4. La date du dernier recalcul est visible partout où un montant réparti est affiché.
5. Une clé manuelle dont la somme ne fait pas 100 % le signale sans bloquer la saisie.
6. Le coût de revient au kg est calculé pour chaque ruche sur une saison réelle *(critère
   d'acceptation n°5 de la V1)*.
7. Une ruche ayant hébergé deux colonies successives dans l'exercice cumule leur production.
8. Une ruche sans production affiche « non calculable », jamais un ratio infini ou nul.
9. Le coût de revient n'est jamais affiché seul, toujours avec sa série pluriannuelle.
10. Une immobilisation de 600 € sur 5 ans génère 5 dotations de 120 €, au prorata sur les
    exercices d'entrée et de sortie.
11. Aucun champ n'est obligatoire ; aucun export fiscal n'est proposé nulle part.
12. Tout fonctionne sans réseau.
13. L'export JSON restitue les six nouvelles tables sans perte.
