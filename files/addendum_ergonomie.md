# Addendum ergonomie
## Spécification d'interface — application de gestion apicole

**Version** 1.0 — août 2026
**Complète** le cahier des charges fonctionnel V1 et l'addendum M12

---

## 1. Contrainte physique fondatrice

L'exploitant travaille avec des **gants en cuir épais**, non capacitifs. L'écran tactile ne répond pas.

Conséquence directe : **aucune interaction tactile n'est possible ruche ouverte.** Toute conception qui suppose de toucher l'écran pendant la visite est à écarter. Deux modes en découlent :

| Mode | Contexte | Interaction |
|---|---|---|
| **Tournée vocale** | Ruche ouverte, gants enfilés | Un appui avant, un appui après. Rien entre les deux. |
| **Saisie manuelle** | Ruche refermée, gants retirés | Tactile complet, au pouce, une main |

Ces deux modes sont **d'égale importance**. La saisie manuelle n'est pas le rattrapage de la dictée : c'est un chemin d'entrée autonome, accessible directement depuis la vue du rucher.

---

## 2. Principes d'interface

1. **Saisie différentielle.** Tout écran de visite s'ouvre pré-rempli avec les valeurs de la visite précédente, la date de référence affichée sous chaque champ. L'exploitant ne saisit que les écarts.
2. **Le raccourci « rien à signaler ».** Un appui enregistre une visite complète avec les valeurs reportées, horodatée et météo-datée.
3. **Aucun clavier.** Compteurs et boutons segmentés partout. Le clavier n'apparaît que pour une note libre écrite, jamais pour une donnée structurée.
4. **Aucun champ obligatoire.** L'enregistrement est toujours possible. Une visite partielle vaut mieux qu'une visite abandonnée.
5. **Ordre de tournée, pas ordre des numéros.** Les colonies s'affichent dans l'ordre du parcours physique, réordonnable et mémorisé par rucher.
6. **Lisibilité au soleil.** Texte foncé sur fond très clair — le mode sombre est contre-indiqué en extérieur. Cibles tactiles ≥ 48 px. Jamais d'information portée par la seule couleur : toujours couleur **et** libellé **et** icône.
7. **Le hors-ligne est l'état normal.** Il est signalé discrètement, jamais bloquant, jamais par une fenêtre modale.
8. **Téléphone et ordinateur : deux interfaces.** Le téléphone capture (visites, photos, recommandations). L'ordinateur analyse (économique, registre, paramétrage, imports). Données communes, écrans distincts.

---

## 3. Provenance des champs

Chaque valeur d'une fiche de visite porte une **provenance**, visible dans l'interface :

| Provenance | Traitement visuel |
|---|---|
| `dicte` | Pastille discrète ; segment audio réécoutable |
| `saisi` | Aucun marquage — c'est le cas nominal |
| `reporte` | Valeur grisée jusqu'à confirmation, date de référence affichée |
| `vide` | Champ en pointillés, mention « non observé » |

**La distinction entre « observé normal » et « non observé » est structurante.** Un historique qui les confond n'est pas exploitable. Un champ non renseigné reste vide, il n'est jamais rempli par défaut.

**Exception au report : les anomalies.** Elles ne sont jamais reportées d'une visite à l'autre. Elles repartent de zéro à chaque visite et doivent être réaffirmées. Sans cette règle, une anomalie constatée une fois se propage indéfiniment.

---

## 4. Système d'états

Quatre niveaux, pas davantage.

| Niveau | Ramp | Déclenchement | Traitement |
|---|---|---|---|
| **Urgent** | Rouge | Règle dont l'échéance arrive ou est dépassée | Bloc dédié en tête d'écran + ligne accentuée dans la liste |
| **Action** | Ambre | Recommandation en attente, sans échéance immédiate | Pastille |
| **À visiter** | Gris | Retard de visite au-delà du seuil saisonnier | Pastille |
| **Normale** | Vert | Aucun des cas ci-dessus | Pastille |

### Discipline de l'état « urgent »

Le niveau n'est utilisable que s'il reste rare. Trois règles :

1. **L'urgence est dérivée, jamais subjective.** Elle découle exclusivement d'une règle du moteur M12 dont l'échéance est atteinte : contrôle d'élevage à date fixe, comptage varroa en niveau fort, cellules royales operculées, pillage constaté, orphelinage au-delà de la fenêtre critique.
2. **L'urgence expire.** Passé l'échéance sans traitement, elle bascule en « action manquée », avec la conséquence explicitée. Une alerte rouge qui persiste trois semaines cesse d'être lue.
3. **Deux urgences maximum affichées par rucher.** Au-delà, l'écran affiche le compte et renvoie vers une liste dédiée.

### Statut et donnée sont distincts

Le statut porte le niveau d'action. L'information qualitative (« essaim en essor », « provisions faibles ») va dans la ligne de données de la colonie, jamais dans un statut supplémentaire. Quatre statuts plus une ligne de données libre valent mieux que six statuts.

---

## 5. Écran A — Vue d'ensemble du rucher

Écran d'arrivée. Répond à une seule question : par où commencer.

### Structure, de haut en bas

1. **En-tête** — nom du rucher, indicateur hors-ligne discret, ligne de contexte : température, vent, et **la donnée climatique qui alimente les règles** (par exemple « 11ᵉ jour sans pluie »). La donnée déclenchante doit être visible, sinon la recommandation paraît arbitraire.
2. **Bloc « à faire en premier »** — visible seulement s'il existe au moins une urgence. Icône, titre avec l'échéance, **motif explicité** (« passé ce stade, la fenêtre d'élevage est manquée »), et un bouton d'accès direct à la fiche.
3. **Action principale** — « Démarrer la tournée vocale », pleine largeur. Un seul bouton dominant par écran.
4. **Liste des colonies** — précédée du libellé « ordre de tournée » et d'une entrée de réordonnancement. Chaque ligne : numéro, ligne de données (année de reine, nombre de cadres), ligne secondaire (délai depuis la dernière visite ou signal en cours), pastille d'état à droite.
5. **Pied** — compteur de visites en attente de synchronisation, et accès secondaire « saisir une visite ».
6. **Légende** — quatre pastilles, une ligne.

### Règles d'affichage

- Une colonie urgente **reste à sa place dans l'ordre de tournée** ; elle apparaît en plus dans le bloc de tête. Le bloc dit quoi faire, la ligne rappelle au moment du passage.
- Réordonner la liste par urgence est proscrit : cela casserait le parcours physique.
- Chaque ligne affiche une donnée concrète, pas seulement un statut. Le statut résume, la donnée informe.

---

## 6. Écran B — Saisie manuelle d'une visite

Ouvert ruche refermée, gants retirés. Format téléphone, colonne unique.

### Structure

1. **En-tête** — numéro de ruche, position dans la tournée, date, heure, température, date de la dernière visite.
2. **Bouton « rien à signaler »** — pleine largeur, en tête. Sous-titre explicatif : « enregistre la visite avec les valeurs ci-dessous ».
3. **Compteurs** — couvain operculé, couvain ouvert, provisions. Boutons moins et plus de 40 px, valeur en 20 px, valeur de référence et date en dessous.
4. **Échelles segmentées** — population de 1 à 5, une rangée de cinq boutons de 40 px de haut. Sélection par appui unique, sans validation.
5. **États segmentés** — ponte (compacte, lacunaire, absente, mâles), reine vue, œufs vus.
6. **Anomalies** — chips multi-sélection, jamais pré-cochées.
7. **Barre d'action** — micro (note vocale), appareil photo, et « enregistrer » occupant le reste de la largeur.

### Règles

- Le clavier n'apparaît jamais dans ce parcours.
- Le bouton d'enregistrement n'est jamais désactivé.
- Le micro reste accessible : une remarque dictée peut compléter une saisie manuelle dans la même visite.
- La photo vaut note : photo plus enregistrement constitue une visite valide.

---

## 7. Écran C — Revue de tournée

Ouvert au retour, sur ordinateur ou téléphone, après transcription. Deux colonnes.

### Colonne de gauche — progression

Liste des colonies de la session avec leur statut de traitement : validée, en cours, en attente. **Elle signale explicitement les colonies du rucher absentes de la dictée** — c'est le seul moyen de rattraper un oubli.

### Colonne de droite — fiche de la colonie sélectionnée

1. **Lecteur audio segmenté** — positionné sur le passage correspondant à cette colonie, avec les bornes affichées. Réécouter cinquante secondes, jamais sept minutes.
2. **Transcription** — texte brut, avec **les corrections du glossaire métier surlignées**. L'exploitant doit voir ce que la machine a interprété pour pouvoir le contester.
3. **Champs extraits** — présentés en cartes, avec la variation par rapport à la visite précédente affichée dans le champ lui-même (« 4 ↓ 6 le 26/07 »). Un chiffre absolu n'informe pas ; un écart, si.
4. **Champs non dictés** — en pointillés, mention explicite.
5. **Recommandations déclenchées** — affichées dans le contexte des données qui les ont produites, avec les trois actions : valider et planifier, différer, rejeter.
6. **Barre d'action** — « corriger un champ » à gauche, « valider et passer à la ruche suivante » à droite.

### Règles

- Un seul chemin de sortie : valider et enchaîner. Le parcours de revue ne repasse jamais par un menu.
- **V1 : la correction se fait dans les champs, pas dans la transcription.** L'édition de la transcription avec recalcul des champs est reportée.

---

## 8. Composants transverses

| Composant | Spécification |
|---|---|
| Compteur | Deux boutons 40 × 40 px, valeur centrale 20 px, plage 0–12, valeur de référence en 11 px dessous |
| Segmenté | Boutons de 40 px de haut, grille égale, sélection unique par appui, état actif en accent |
| Chips | Multi-sélection, 7 px vertical / 11 px horizontal, jamais pré-cochées |
| Pastille d'état | 11 px, fond teinté, texte dans le stop foncé de la même gamme, icône pour l'état urgent |
| Bandeau hors-ligne | Mention textuelle en en-tête, compteur d'éléments en attente en pied. Jamais modal |
| Bouton principal | Un seul par écran, pleine largeur, 46 px |

---

## 9. Typographie et couleur

- Corps de texte 13 px minimum, jamais moins de 11 px pour les mentions secondaires.
- Deux graisses uniquement : normale et médium.
- Contraste maximal privilégié sur l'élégance : l'écran est lu en plein soleil.
- Toute information d'état est portée par **trois canaux simultanés** : couleur, libellé texte, icône ou forme.
- Légende des états présente sur tout écran qui les utilise.

---

## Annexe — Glossaire de correction pour la dictée

À transmettre au modèle comme lexique de correction phonétique lors de la structuration.

**Anatomie et colonie**
couvain, couvain operculé, couvain ouvert, larves, nymphes, œufs, reine, faux-bourdon, ouvrière, nourrice, butineuse, gardienne, cirière, ventileuse

**Matériel**
ruche, ruchette, hausse, corps, cadre, cadre gaufré, cire gaufrée, partition, nourrisseur, couvre-cadres, plateau, lange, lève-cadre, enfumoir, grille à reine, Dadant, Langstroth, Warré, nucléi

**États et phénomènes**
bourdonneuse, orpheline, essaimage, essaim, supersédure, sauveté, cellule royale, cellule de sauveté, pillage, dérive, disette, miellée, operculation, bâtisse, ponte compacte, ponte lacunaire

**Sanitaire**
varroa, Varroa destructor, acide oxalique, acide formique, thymol, lanière, sublimation, dégouttement, fausse teigne, loque américaine, loque européenne, nosémose, frelon asiatique, comptage, lange graissé

**Produits**
miel, cire, propolis, pollen, gelée royale, sirop, candi, pâte protéinée, nectar

**Confusions phonétiques fréquentes à corriger**
« couins », « ciao », « couvin » → couvain · « bourdonneuse » souvent transcrit « bourdon neuse » · « operculé » → « ope culé », « au perle » · « lève-cadre » → « lev cadre » · « miellée » → « mielée », « mi les » · « hausse » → « os », « ausse » · « varroa » → « varois », « varoa »
