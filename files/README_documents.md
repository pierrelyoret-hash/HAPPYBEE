# Documents du projet — application de gestion apicole
*Mise à jour du 11 août 2026*

## À lire maintenant

| Fichier | Rôle | Statut |
|---|---|---|
| **`brief_L1plus_complement.md`** | **Lot en cours.** Incrément sur le socle L1 livré : score de ponte, signes sanitaires, parcours danger catégorie 1, table `observation_cadre` au schéma | **Actif** |

## Documents de référence

| Fichier | Rôle |
|---|---|
| `cahier_des_charges_v1_application_apicole.md` | Spécification maîtresse : périmètre, modèle de données, exigences M1 à M13, règles de gestion, jalons, arbitrages actés |
| `addendum_ergonomie.md` | Interface : principes, trois écrans, composants, système d'états, répartition par lot, glossaire de dictée |
| `observation_cadre_et_cartographie_lots.md` | Modèle d'observation cadre par cadre (standards COLOSS, Liebefeld), taxonomie sanitaire, liste exhaustive des fonctionnalités par lot |
| `addendum_M12_moteur_recommandations.md` | Moteur de recommandations : architecture à deux couches, catalogue de règles, déclencheurs météo |

## Archives

| Fichier | Rôle |
|---|---|
| `brief_demarrage_L1_claude_code.md` | Brief du lot L1 initial — **livré le 10/08/2026**. Conservé pour mémoire, ne plus exécuter |
| `benchmark_applications_apicoles.md` | Étude de marché préalable. Documentation, sans usage pour le développement |

---

## État de la trajectoire

| Lot | Contenu | Statut |
|---|---|---|
| L1 | Socle : référentiel, carnet de visite, historique, import CSV, export JSON, PWA | **Livré 10/08/2026** |
| **L1+** | **Score de ponte, sanitaire, table `observation_cadre`** | **En cours** |
| Revue ergo | Révision après 3 visites réelles | À faire avant L2 |
| L2 | Synchronisation, photos, dictée, revue de tournée, observation cadre par cadre (M13) | Planifié — lot le plus lourd, à séquencer |
| L3 | Traitements, comptages varroa, nourrissement, mouvements, récoltes, tâches | Planifié |
| L3bis | Météo et moteur de recommandations (M12) | Planifié |
| L4 | Registre d'élevage, export PDF paginé | Planifié |
| L5 | Module économique, comptabilité analytique par ruche | Planifié |
| L6 | Assistant IA, finitions | Planifié |

---

## Trois règles qui traversent tous les lots

**Aucune interface ordinateur avant L4.** Jusqu'à L3 inclus, tout se passe sur le téléphone.

**Aucun conseil sanitaire ni diagnostic, à aucun moment.** L'application affiche du contenu réglementaire statique et renvoie vers le vétérinaire, le TSA ou le GDS.

**Passage au rucher entre chaque étape.** Un lot livré d'un bloc, sans confrontation au terrain, est un lot abandonné.
