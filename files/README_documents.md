# Documents du projet — application de gestion apicole
*Mise à jour du 18 août 2026 — remplace la version du 11 août, devenue fausse sur presque tous ses points*

## À lire maintenant

| Fichier | Rôle | Statut |
|---|---|---|
| **`brief_L3bis_moteur_regles.md`** | **Lot en cours.** Historique météo par rucher, moteur de règles déterministe versionné, catalogue de huit règles nouvelles. Arbitrages d'ouverture au §21 du cahier des charges | **Actif** |

## Documents de référence

| Fichier | Rôle |
|---|---|
| `cahier_des_charges_v1_application_apicole.md` | **Spécification maîtresse** : périmètre, modèle de données, exigences M1 à M13, règles de gestion, jalons (§8), et **tous les arbitrages actés** (§13 à §21) — c'est la section à consulter avant de supposer qu'une décision tient toujours |
| `addendum_ergonomie.md` | Interface : principes, écrans, composants, système d'états, glossaire de dictée |
| `observation_cadre_et_cartographie_lots.md` | Modèle d'observation cadre par cadre (standards COLOSS, Liebefeld), taxonomie sanitaire, **cartographie des fonctionnalités par lot** |
| `brief_refonte_visuelle.md` | Jetons de design, typographie, système d'états — appliqué au lot du 15/08 |

## Briefs de lot

| Fichier | Lot | Statut |
|---|---|---|
| `brief_L1plus_complement.md` | L1+ | Livré |
| `brief_L2.2_sanitaire.md` | L2.2 | Livré 12/08/2026 |
| `brief_corrections_ecrans_L1.md` | Corrections d'écrans | **Partiellement révoqué** — voir l'avertissement ci-dessous |
| `brief_L3bis_moteur_regles.md` | L3bis | En cours |
| `spec_dictee_hors_ligne.md` | Repli hors-ligne de la dictée (2-UI → 3-BUILD, 16/08) | À implémenter |

> **Avertissement sur `brief_corrections_ecrans_L1.md`.** Ce brief du 11/08 a été partiellement
> révoqué par les arbitrages des 14 et 15/08. Ne pas l'utiliser comme grille d'audit sans filtre :
> son critère n°3 (« aucun bouton ne porte de vert ni de bleu ») est **annulé** par le §17 du
> cahier des charges, qui a introduit la palette d'accent miel/vert/bordeaux ; son rang 8 (liens
> utilitaires en pied d'écran) vise un écran d'accueil qui a été remplacé ; son rang 10 (jetons de
> design) est livré. Restent applicables : les rangs 1 à 7 et les critères 1, 2, 4, 5, 6, 7, 9 à 13.

## Archives

`files/Archives/` contient des **instantanés périmés** conservés pour mémoire — le cahier des
charges y compte 463 lignes contre 680 à la racine. Ne jamais s'y référer pour une décision en
cours.

| Fichier | Rôle |
|---|---|
| `brief_demarrage_L1_claude_code.md` | Brief du lot L1 initial — livré le 10/08/2026, ne plus exécuter |
| `benchmark_applications_apicoles.md` | Étude de marché préalable, sans usage pour le développement |
| `cahier_des_charges_v1_application_apicole.md` | Instantané du 11/08 — **périmé**, la version vivante est à la racine |
| `addendum_ergonomie.md` | Instantané du 11/08 — **périmé**, la version vivante est à la racine |
| `addendum_M12_moteur_recommandations.md` | **Cas particulier : ce fichier n'existe qu'ici.** Il reste la source d'origine du moteur de recommandations, mais il date du 10/08 et n'a jamais été mis à jour — il est antérieur à L2.2, L3 et aux arbitrages des 14 au 16/08. **`brief_L3bis_moteur_regles.md` prime sur lui** partout où les deux divergent |

---

## État de la trajectoire

| Lot | Contenu | Statut |
|---|---|---|
| L1 | Socle : référentiel, carnet de visite, historique, import CSV, export JSON, PWA | **Livré 10/08/2026** |
| L1+ | Score de ponte, taxonomie sanitaire, parcours danger catégorie 1, table `observation_cadre` | **Livré** (date exacte non consignée) |
| Revue ergo | Révision de l'ergonomie | **Réalisée** — revue sur captures du 11/08, retours d'usage réel du 14/08, refonte visuelle du 15/08 |
| L2 | Synchronisation, photos, dictée, revue de tournée, observation cadre par cadre (M13) | **Livré 13/08/2026** |
| L2.2 | Sanitaire : traitements, comptages varroa, nourrissement, rappels, export PDF | **Livré 12/08/2026** |
| L3 | Mouvements, récoltes, rendement, tâches manuelles et vue consolidée | **Livré 13/08/2026** |
| M8 | Module météo : prévisions par rucher, cache hors-ligne, station Netatmo domicile | **Livré 15/08/2026** |
| Refonte visuelle | Bandeau miel, cibles tactiles, fil de tournée, barre d'onglets | **Livré 15/08/2026** |
| Dictée intégrée | Dictée dans la saisie de visite | **Livré 16/08/2026** — commits 0fbb7d4, 2c80189, a232014, fusionnés |
| **L3bis** | **Météo historique + moteur de règles** | **En cours** — brief du 18/08/2026 |
| L4 | **Économique** (M6) — *anciennement L5, inversé le 18/08* | Planifié |
| L5 | **Registre d'élevage** (M5) — *anciennement L4, inversé le 18/08* | Planifié |
| L6 | Assistant IA, reste de M10/M11, finitions | Planifié |

---

## Trois règles qui traversent tous les lots

**Aucune interface ordinateur avant L4.** Jusqu'à L3 inclus, tout se passe sur le téléphone.

**Aucun conseil sanitaire ni diagnostic, à aucun moment.** L'application affiche du contenu
réglementaire statique et renvoie vers le vétérinaire, le TSA ou le GDS.

> **Précision apportée le 18/08/2026 à l'ouverture de L3bis.** Cette règle n'est pas levée par le
> moteur de recommandations, elle en délimite le périmètre : le moteur propose des **actions de
> conduite** (aller vérifier, nourrir, ombrager, poser une hausse), jamais un **diagnostic** ni un
> protocole de soin. Une recommandation n'est jamais un enregistrement sanitaire tant que
> l'exploitant n'a pas saisi l'acte lui-même, et le parcours danger de catégorie 1 (F3.8) prime et
> reste inchangé. Voir §8 du brief L3bis.

**Passage au rucher entre chaque étape.** Un lot livré d'un bloc, sans confrontation au terrain,
est un lot abandonné.
