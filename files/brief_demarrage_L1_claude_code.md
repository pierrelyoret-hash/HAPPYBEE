# Brief de démarrage — Lot L1
## Application de gestion apicole · point d'entrée pour Claude Code

**À lire en premier.** Ce document est le point d'entrée. Les trois documents de référence — cahier des charges V1, addendum M12 (moteur de recommandations), addendum ergonomie — le complètent mais ne sont pas nécessaires pour démarrer L1.

---

## 1. Objectif du lot L1

Obtenir en une à deux sessions une application **utilisable au rucher dès la prochaine visite**, fonctionnant entièrement en local, sans compte, sans serveur, sans réseau.

Critère unique de réussite : **saisir une visite complète, sans réseau, en moins d'une minute.**

---

## 2. Périmètre

### Dans le lot

- Référentiel : ruchers, ruches, colonies, reines
- Vue d'ensemble d'un rucher (écran A)
- Saisie manuelle d'une visite (écran B)
- Historique d'une colonie
- Import du fichier CSV existant
- Export et restauration JSON
- Persistance locale IndexedDB
- PWA installable sur téléphone

### Explicitement hors du lot

Ne pas commencer, même partiellement :

- Synchronisation entre appareils, backend, authentification
- Dictée vocale et transcription
- Écran de revue de tournée
- Moteur de recommandations
- Photos
- Module économique
- Registre d'élevage
- Météo
- Appels IA

Ces éléments sont spécifiés ailleurs et viendront ensuite. Les anticiper dans le code de L1 est la principale cause d'enlisement.

**Seule concession à l'avenir :** le schéma de données doit inclure dès maintenant `created_at`, `updated_at`, `deleted_at` sur toutes les tables, et pratiquer la **suppression logique uniquement**. Rétrofiter cela après coup est douloureux.

---

## 3. Pile technique

| Couche | Choix |
|---|---|
| Framework | React + Vite |
| Style | Tailwind |
| Persistance | IndexedDB via Dexie |
| PWA | vite-plugin-pwa |
| Langue | Français, sans internationalisation |
| Hébergement | Aucun en L1 — exécution locale ou fichier statique |

Aucune dépendance réseau au runtime. Aucune bibliothèque de composants lourde : les écrans sont simples, les composants sur mesure sont plus rapides à écrire qu'à configurer.

---

## 4. Modèle de données du lot L1

Champs communs à toutes les tables : `id` (uuid), `created_at`, `updated_at`, `deleted_at`.

```
rucher      nom, commune, latitude, longitude, altitude,
            ordre_tournee (tableau d'ids de ruches), notes

ruche       rucher_id, numero, type, date_acquisition, origine,
            statut (active | stockee | reformee)

colonie     ruche_id, date_debut, date_fin, motif_fin, origine,
            colonie_mere_id, race_presumee,
            statut (active | morte | reunie)

reine       colonie_id, annee_naissance, origine, marquage_couleur,
            marquee, date_introduction, date_fin, motif_fin

visite      colonie_id, date, heure, type,
            meteo_temp, meteo_conditions,
            nb_cadres_couvain_opercule, nb_cadres_couvain_ouvert,
            nb_cadres_provisions, nb_cadres_batis, population,
            reine_vue, oeufs_vus, ponte_qualite, temperament,
            anomalies (tableau), observation_libre,
            action_entreprise, priorite, suivi_prevu_le,
            provenance_champs (objet : champ → dicte|saisi|reporte|vide)

tache       colonie_id, rucher_id, libelle, date_echeance,
            priorite, origine, statut
```

**Point d'attention.** La séparation `ruche` / `colonie` est obligatoire et non négociable. La ruche est le contenant, la colonie le vivant. Lors d'un transvasement ou d'une mortalité suivie d'un repeuplement, la colonie change et la ruche reste. Fusionner les deux rend l'historique faux dès le premier incident.

---

## 5. Ordre de travail

Traiter dans cet ordre, en validant chaque étape avant la suivante.

**Étape 1 — Schéma et persistance.** Tables Dexie, opérations de base, jeu de données de démonstration en dur. Aucune interface. Vérifier en console.

**Étape 2 — Écran B, saisie de visite.** Le cœur de l'outil, à faire avant tout le reste. Compteurs, segmentés, chips, bouton « rien à signaler », pré-remplissage depuis la visite précédente, provenance des champs. Aucun clavier, aucun champ obligatoire.

**Étape 3 — Écran A, vue d'ensemble.** Liste dans l'ordre de tournée, quatre niveaux d'état, réordonnancement. En L1, l'état « urgent » se calcule uniquement sur les échéances de tâches saisies manuellement — le moteur de règles viendra plus tard.

**Étape 4 — Historique d'une colonie.** Liste chronologique des visites, avec les écarts entre visites successives.

**Étape 5 — Import CSV.** Voir §6.

**Étape 6 — Export et restauration JSON.** Un bouton, un fichier, une restauration complète. À faire avant d'utiliser l'application pour de vrai : sans export, la première perte de données est définitive.

**Étape 7 — PWA.** Manifeste, service worker, installation sur téléphone, vérification du fonctionnement en mode avion.

---

## 6. Spécification de l'import CSV

Fichier `archives_apicoles.csv`, encodage UTF-8, séparateur point-virgule, 11 colonnes :

```
Date;Heure;Ruche;Type;Observation;Contexte climatique;
Action entreprise;Résultat/Suivi;Priorité;Échéance;Notes
```

Particularités relevées dans le fichier réel, à traiter explicitement :

| Cas | Traitement |
|---|---|
| Valeur `-` | À interpréter comme vide, dans toutes les colonnes |
| Colonne `Ruche` valant `Toutes` | Créer une entrée par colonie active du rucher à cette date, ou une entrée de niveau rucher. **Demander l'arbitrage à l'utilisateur dans l'écran d'import** |
| Format de date | `JJ/MM/AAAA` |
| Format d'heure | `16h00` — parser ou conserver en texte |
| Lignes non triées | Le fichier n'est pas chronologique. Trier à l'import |
| `Type` | Valeurs observées : `Observation`, `Traitement` |
| `Priorité` | `Urgent`, `Moyen`, `Faible` |
| `Échéance` renseignée | Créer une `tache` liée à la visite |

**Règle impérative :** le texte d'origine des colonnes `Observation`, `Action entreprise`, `Résultat/Suivi` et `Notes` est conservé intégralement dans `observation_libre` et `action_entreprise`. Aucune tentative d'extraction automatique vers les champs structurés en L1 — les données sont trop hétérogènes, et une extraction approximative est pire qu'un texte brut fidèle.

Prévoir un écran de prévisualisation avant validation, avec le nombre de lignes lues, les lignes en erreur, et la correspondance des colonnes.

---

## 7. Jeu de données de démarrage

À saisir manuellement après l'étape 3, avant l'import :

- Un rucher : Dompierre-les-Ormes, 450 m
- Trois ruches actives, conformes à la déclaration de détention en cours
- Les colonies correspondantes, avec la colonie de la ruche 3 en statut particulier (sans reine confirmée)
- L'ordre de tournée réel

Une application vide ne se teste pas.

---

## 8. Critères d'acceptation du lot

1. Une visite complète est saisie en moins d'une minute, sans clavier, sur téléphone.
2. Le bouton « rien à signaler » enregistre une visite valide en un appui.
3. Les valeurs de la visite précédente sont pré-remplies, avec leur date de référence.
4. Les anomalies ne sont jamais reportées d'une visite à l'autre.
5. Un champ non renseigné reste distinguable d'un champ renseigné à zéro.
6. La liste des colonies suit l'ordre de tournée, réordonnable et mémorisé.
7. L'application fonctionne intégralement en mode avion.
8. L'export JSON est produit et restauré sans perte.
9. Le fichier CSV est importé sans perte de texte.
10. L'application est installée sur le téléphone et lancée depuis l'écran d'accueil.

---

## 9. Pièges à éviter

- **Anticiper la synchronisation.** Elle change l'architecture ; elle est spécifiée pour L2. En L1, une seule source de données locale.
- **Rendre des champs obligatoires.** Aucun ne l'est. Un formulaire qui bloque est un formulaire abandonné.
- **Reporter les anomalies.** Elles repartent de zéro à chaque visite.
- **Confondre vide et zéro.** Zéro cadre de couvain est une observation ; non renseigné n'en est pas une.
- **Utiliser un mode sombre.** L'écran est lu en plein soleil : texte foncé sur fond clair.
- **Placer la navigation en haut.** Tout doit être atteignable au pouce, en bas d'écran.
- **Encoder une information par la seule couleur.** Toujours couleur, libellé et icône.
- **Supprimer physiquement des enregistrements.** Suppression logique uniquement, dès L1.
- **Attendre d'avoir fini pour aller au rucher.** Dès que l'étape 2 fonctionne, l'emporter sur une visite réelle. Les irritants ne se découvrent pas au bureau.

---

## 10. Après L1

Ne pas enchaîner immédiatement. Utiliser l'application sur **au moins trois visites réelles** avant d'ouvrir le lot suivant. La cause la plus fréquente d'abandon d'un outil personnel est une V1 livrée d'un bloc, sans confrontation au terrain entre deux étapes.

Le lot L2 traitera la synchronisation et la dictée vocale. C'est à ce moment, et pas avant, que les comptes d'hébergement et de backend deviennent nécessaires.
