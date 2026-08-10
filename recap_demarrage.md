# Récapitulatif de démarrage — Lot L1

Ce document résume les échanges déjà eus avec Claude Code au sujet du lot L1
(application de gestion apicole). À donner à lire en premier dans la nouvelle
session, avant de reprendre le travail.

## Documents de référence

- `files/brief_demarrage_L1_claude_code.md` — spécification du lot L1
- `files/addendum_ergonomie.md` — spécification d'interface

## Compréhension du brief (validée)

1. Objectif : une PWA locale utilisable au rucher dès la prochaine visite, 100 % hors-ligne, sans compte ni serveur.
2. Critère de succès unique : saisir une visite complète en moins d'une minute, sans réseau.
3. Périmètre : référentiel (rucher / ruche / colonie / reine), écran vue d'ensemble (A), écran saisie de visite (B), historique de colonie, import CSV, export/restauration JSON, PWA installable.
4. Hors périmètre, à ne pas anticiper même partiellement : synchro multi-appareils, dictée vocale, écran de revue de tournée, moteur de recommandations, photos, module économique, registre d'élevage, météo, appels IA.
5. Modèle de données figé dès L1 : `created_at`/`updated_at`/`deleted_at` sur toutes les tables, suppression logique uniquement, séparation stricte ruche (contenant) / colonie (vivant).
6. Stack : React + Vite, Tailwind, Dexie (IndexedDB), vite-plugin-pwa, tout en français, composants sur mesure plutôt que bibliothèque lourde.
7. Écran B (le cœur, à faire avant tout le reste) : saisie différentielle pré-remplie depuis la visite précédente, bouton « rien à signaler », compteurs/segmentés/chips, aucun clavier hormis la note libre, aucun champ obligatoire, anomalies jamais reportées.
8. Écran A : liste dans l'ordre de tournée (réordonnable, mémorisé), 4 pastilles d'état, mais en L1 le calcul automatique ne porte que sur les échéances de tâches saisies à la main.
9. Import CSV : `archives_apicoles.csv` (pas encore fourni), 11 colonnes séparées par `;`, tri chronologique à l'import, `-` = vide, texte des colonnes libres conservé intégralement (aucune extraction automatique), écran de prévisualisation, arbitrage utilisateur si `Ruche = Toutes`.
10. Méthode : 7 étapes du §5 du brief, validation après chacune ; jeu de données de démo (Dompierre-les-Ormes, 3 ruches) saisi après l'étape 3, avant l'import ; pas d'enchaînement sur L2 avant au moins trois visites réelles.

## Points de clarification validés par l'utilisateur

1. **États « action »/« à visiter »** — implémenter *urgent* (tâches à échéance) et *à visiter* (délai depuis dernière visite, seuil saisonnier à proposer) ; *action* reste inactive en L1 faute de moteur de recommandations.
2. **Mode vocal / écran C / distinction téléphone-ordinateur** — exclus totalement de L1. Une seule interface, tactile, orientée téléphone.
3. **Cahier des charges V1 et addendum M12** — absents du dossier, non nécessaires pour démarrer L1 (le brief le confirme). On travaille uniquement avec les deux documents présents.
4. **Colonie de la ruche 3 (« sans reine confirmée »)** — statut « active », simplement aucun enregistrement `reine` associé (le modèle ne prévoit pas de statut colonie dédié à ce cas).
5. **`provenance_champs`** — champ présent dans le schéma comme demandé, mais la valeur `dicte` restera inutilisée en L1 (pas de dictée dans ce lot).
6. **Emplacement du projet** — `/Users/etherys/Desktop/HAPPYBEE/` (confirmé, sans lien avec un autre projet nommé MONPOTAGER).

## Point en attente

- Le fichier `archives_apicoles.csv` n'a pas encore été fourni. Nécessaire avant l'étape 5 (import), pas avant.

## Prochaine étape

Proposer la structure de fichiers du projet (point 2 de la méthode de travail demandée),
puis attendre validation avant de commencer l'étape 1 (§5 du brief : schéma Dexie et
persistance, sans interface).
