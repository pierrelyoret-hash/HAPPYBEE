# Brief L2.2 — Sanitaire

## Traitements, comptages varroa, nourrissement, rappels, export PDF sanitaire

**Contexte.** Reprioritisation actée le 12/08/2026 : le sanitaire (M3) devient un lot à part entière, nommé **L2.2**, inséré dans la trajectoire entre **L2** (synchronisation livrée — jumelage, sync bidirectionnelle ; photos, dictée, revue de tournée et cadre par cadre restent en pause) et **L3**. Les fonctionnalités sanitaires jusqu'ici prévues en L3/L3bis/L4 sont transposées ici quand elles relèvent du carnet de bord sanitaire ; ce qui n'en relève pas (mouvements, récoltes, rendement, moteur météo, registre complet) reste à sa place d'origine. Ce document reprend strictement le modèle déjà validé dans `cahier_des_charges_v1_application_apicole.md` §4.2 et §5 (F3.1-F3.8) — rien n'est inventé, tout est cité.

---

## 1. Objectif

Tracer les traitements sanitaires, les comptages varroa et les nourrissements par colonie, avec un historique consultable, des rappels automatiques strictement limités aux règles déjà écrites dans le cahier des charges (délai d'attente, seuils varroa), et un export PDF ciblé aux données sanitaires. Le sanitaire reste un **carnet de bord**, jamais un conseiller : aucune suggestion, aucune recommandation, aucune heuristique de conduite au-delà de ce qui est explicitement spécifié ci-dessous.

---

## 2. Périmètre

### Dans L2.2

1. **`traitement`** — enregistrement complet : colonie, produit, numéro AMM, numéro de lot, dosage, voie (lanière / sublimation / dégouttement / autre), motif, délai d'attente en jours, date de fin de délai (**calculée**), conformité bio (bool), notes.
2. **`comptage_varroa`** — méthode (lange graissé / sucre glace / lavage alcool / comptage naturel), durée en jours, nombre de varroas, varroas/jour (**calculé**), niveau d'alerte (**calculé** sur seuils saisonniers paramétrables — valeurs par défaut §5 F3.4).
3. **`nourrissement`** — type (sirop léger / sirop lourd / candi / pâte protéinée), quantité, unité, composition, origine du produit (acheté / fabriqué / miel de l'exploitation).
4. **Historique par colonie** — traitements, comptages et nourrissements mêlés, tri chronologique décroissant, même esprit que l'historique des visites déjà construit.
5. **Table `document`** (schéma minimal : type, date, fichier, libellé, entité liée) + rattachement d'une ordonnance ou d'un compte rendu de visite sanitaire à un traitement (F3.6). Pas d'écran de gestion documentaire séparé dans ce lot — juste la capacité de lier un fichier à un traitement.
6. **Rappels automatiques**, strictement les règles déjà écrites au §6.3 du cahier des charges :
   - Traitement enregistré avec délai d'attente → tâche à la date de fin de délai, libellé « Récolte à nouveau autorisée »
   - Comptage varroa niveau **fort** → tâche J+2 « Intervenir », tâche J+21 « Recompter »
   - Comptage varroa niveau **modéré** → tâche J+14 « Recompter »
7. **Marquage de conformité bio** (F3.5) — champ bool visible dans l'historique **et reporté dans l'export PDF sanitaire** (point 8).
8. **Export PDF sanitaire** (transposé depuis M5/L4, confirmé le 12/08/2026) — un PDF regroupant, sur une période sélectionnable (par défaut l'exercice en cours, cohérent F5.3), les traitements (avec conformité bio) et les comptages varroa d'un ou plusieurs ruchers. Correspond aux blocs **« encadrement sanitaire »** et **« interventions vétérinaires »** de l'article 3 de l'arrêté du 5 juin 2000 (F5.1) — deux des cinq blocs réglementaires. Ce n'est pas le registre d'élevage complet : pas de pagination continue multi-blocs, pas d'annexe documentaire (F5.2/F5.4), pas les trois autres blocs (fiche synthétique de l'exploitation, mouvements des animaux, entretien et soins). Le registre complet reste en L4, qui réutilisera cette génération PDF pour ses deux blocs sanitaires plutôt que de la reconstruire.

### Explicitement hors de L2.2

- **Aucune suggestion, alerte de conduite ou recommandation au-delà des trois rappels listés au point 6.** Pas de « seuil critique → traitement suggéré », pas de blocage de saisie, pas de limite de fréquence imposée. Une donnée fausse par contournement d'un blocage est pire qu'une donnée absente (principe déjà acté pour la saisie de visite).
- **Blocage de récolte pendant le délai d'attente** (F3.2) — la fonctionnalité récolte (M4) n'existe pas encore, donc rien à bloquer. `date_fin_delai_attente` est calculée et stockée dès ce lot pour que le blocage soit immédiat à construire à l'ouverture de M4, sans ressaisie.
- **Registre d'élevage complet, cinq blocs, paginé** (F5.1-F5.4 intégralement) — reste en L4. L2.2 ne livre que les deux blocs sanitaires isolés (point 8), pas l'assemblage réglementaire complet ni l'annexe documentaire.
- **Catalogue de « types de traitements » avec CRUD séparé** — `traitement.produit` reste un champ texte libre, comme déjà spécifié. Pas de table de référence à administrer.
- **Gestion de stock de produits** — absente du cahier des charges, non ajoutée ici.
- **Mouvements de ruches/colonies, récoltes, rendement** — reste en L3, hors de L2.2.
- **Vue consolidée générale des tâches, création manuelle libre** (M7 générique) — seuls les trois rappels du point 6 sont automatisés ; la gestion complète des tâches reste ouverte, en L3.
- **Moteur de règles pondéré par la météo** (addendum M12, lot L3bis) — R-COUV-01 et toute règle météo-dépendante restent hors de L2.2, sans exception. Ce point reste ferme même sous l'instruction de transposition : le moteur météo n'est pas un rappel fixe, c'est une heuristique de conduite, catégoriquement exclue du carnet de bord à tout lot.
- **Reste de L2** (photos, dictée, revue de tournée, cadre par cadre) — en pause, repris après L2.2.

---

## 3. Spécification des champs

### `traitement`

```
colonie_id, date_debut, date_fin,
produit, numero_amm, numero_lot, dosage,
voie (lanière | sublimation | dégouttement | autre),
motif,
delai_attente_jours, date_fin_delai_attente (calculée = date_fin + delai_attente_jours),
ordonnance_document_id (nullable),
conforme_bio (bool),
notes
```

Aucun champ obligatoire, conforme au principe général. `date_fin_delai_attente` se recalcule si `date_fin` ou `delai_attente_jours` change.

### `comptage_varroa`

```
colonie_id, date,
methode (lange graissé | sucre glace | lavage alcool | comptage naturel),
duree_jours, nb_varroas,
varroas_par_jour (calculé = nb_varroas / duree_jours),
niveau_alerte (calculé)
```

Seuils par défaut (§5 F3.4, paramétrables) :
```
avril-mai   : faible < 1 · modéré 1-5 · fort > 5
juin-juillet: faible < 2 · modéré 2-8 · fort > 8
```
En dehors de ces deux fenêtres, aucun seuil par défaut n'est spécifié dans le cahier des charges — le comptage est enregistré, `niveau_alerte` reste vide plutôt que d'inventer un seuil non validé.

### `nourrissement`

```
colonie_id, date,
type (sirop léger | sirop lourd | candi | pâte protéinée),
quantite, unite,
composition,
origine_produit (acheté | fabriqué | miel de l'exploitation),
notes
```

### `document` (schéma minimal, F3.6)

```
type (ordonnance | compte rendu de visite sanitaire | résultat d'analyse | récépissé de déclaration | facture | attestation),
date, fichier, libelle,
entite_liee_type, entite_liee_id
```

Dans ce lot : uniquement le rattachement d'un fichier à un `traitement` via `ordonnance_document_id`. Pas d'écran de gestion documentaire transversal.

---

## 4. Écrans

Même système que le reste de l'application (jetons de design déjà en place, aucune nouveauté visuelle) :

- **Historique sanitaire par colonie** — accessible depuis la fiche colonie ou l'historique des visites existant, sur le même modèle (lignes réglées, filet 1px, mono pour les données chiffrées, provenance visible).
- **Saisie d'un traitement / comptage / nourrissement** — trois écrans courts, aucun champ obligatoire, composants déjà existants (Compteur, Segmente, Chips), `BoutonRetour` en haut et en bas.
- **Rappels générés** — apparaissent dans le bloc « à faire en premier » de l'écran d'accueil, exactement comme les tâches actuelles, avec le bouton « ✓ Fait » déjà construit. Aucun nouvel écran de gestion des tâches.
- **Export PDF sanitaire** — un geste depuis l'historique sanitaire ou l'écran d'accueil (même esprit que l'export JSON en un geste déjà en place), avec sélection de période (par défaut l'exercice en cours). Nécessite l'ajout d'une dépendance de génération PDF côté client (aucune actuellement dans le projet).

---

## 5. Ordre de travail

1. Schéma (tables `traitement`, `comptage_varroa`, `nourrissement`, `document` — local et Supabase), migration non destructive, vérification par export JSON avant/après comme pour les lots précédents.
2. Écran de saisie d'un traitement + historique.
3. Écran de saisie d'un comptage varroa + calcul du niveau d'alerte + historique.
4. Écran de saisie d'un nourrissement + historique.
5. Génération automatique des trois rappels (§2, point 6).
6. Export PDF sanitaire (§2, point 8).
7. Vérification de non-régression : aucun champ obligatoire, écrans existants inchangés.

Valider chaque étape avant la suivante, passage au rucher recommandé avant l'étape 5 (les rappels touchent l'écran d'accueil que tu utilises à chaque visite) et avant l'étape 6 (le PDF doit être lisible sur un cas réel).

---

## 6. Critères d'acceptation

1. Un traitement se saisit sans champ obligatoire et apparaît dans l'historique de la colonie.
2. `date_fin_delai_attente` se recalcule correctement si les champs dont elle dépend changent.
3. Un comptage varroa calcule correctement varroas/jour et le niveau d'alerte selon les seuils saisonniers.
4. Un nourrissement se saisit et apparaît dans l'historique.
5. Les trois rappels du §2 (point 6), et eux seuls, génèrent une tâche automatiquement — aucune suggestion ni recommandation nulle part.
6. L'export PDF sanitaire produit un document lisible couvrant les traitements (avec conformité bio) et les comptages varroa de la période sélectionnée, sans prétendre être le registre complet.
7. L'export JSON restitue les nouvelles tables sans perte.
8. Aucun écran existant n'est cassé par cette migration.
