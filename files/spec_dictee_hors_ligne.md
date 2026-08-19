# Spec d'interaction — Repli hors-ligne de la dictée intégrée

**Émetteur** : 2-UI (UI/UX) · **Destinataire** : 3-BUILD · **Date** : 16/08/2026
**Arbitrage** : Pierre, via 0-BASE — « le repli sur note libre est la direction ».
**Écran concerné** : `src/features/saisie-visite/SaisieVisite.jsx` (dictée intégrée, bouton
« ● Dicter la visite »). **Aucun autre écran n'est touché.**

---

## 1. Le problème

Vérifié dans le code, pas supposé :

| Étape | Où elle tourne | Hors-ligne |
|---|---|---|
| `transcrire()` — `src/lib/transcription.js` | **en local** (Whisper, modèle en cache navigateur) | **fonctionne** |
| `structurerDictee()` — `src/lib/structurationIA.js` | **fonction Edge Supabase** | **échoue** — aucune gestion hors-ligne, aucune file d'attente |

La dictée intégrée ne persiste pas l'audio (choix assumé : elle sert à *dicter maintenant, remplir
maintenant* ; le parcours différé existe déjà, c'est Tournée vocale → Revue de tournée).

**Conséquence actuelle : au rucher sans réseau, la dictée échoue systématiquement et tout ce que
l'exploitant a dit est perdu.** Il parle, il attend la transcription locale — qui réussit —, et il
obtient « Échec ». L'absence de réseau au rucher n'est pas un cas dégradé : c'est la situation que
l'application revendique de couvrir.

Le `catch` unique actuel aggrave le diagnostic : il confond un échec de transcription (rien à
sauver) et un échec de structuration (le texte existe), et affiche le même message pour les deux.

---

## 2. Principe retenu

> **La transcription a réussi. On ne jette pas les mots de l'exploitant parce que l'IA n'a pas pu
> les ranger dans des cases.**

Quand la structuration échoue, le texte transcrit est **déposé dans la note libre**. L'exploitant
garde ses propres mots — le seul endroit de l'application où il se relit (brief refonte §5) — et
remplit les compteurs au doigt, ce qu'il sait déjà faire.

C'est un **succès dégradé, pas une erreur** : le traiter visuellement comme un échec
mentirait sur ce qui s'est passé et pousserait à recommencer une dictée qui, elle, a marché.

---

## 3. Comportement cible, étape par étape

### Étape A — transcription (locale)
- **Réussite** → on enchaîne sur la structuration, inchangé.
- **Échec** → rien à sauver, rien à promettre. Message honnête, style erreur (voir §4).

### Étape B — structuration (réseau)
- **Réussite** → remplissage des champs comme aujourd'hui, inchangé.
- **Échec** → **repli** :
  1. Le texte transcrit est **ajouté à la note libre**, jamais substitué à son contenu. Si la note
     contient déjà quelque chose (saisi à la main avant de dicter), le texte dicté vient **à la
     suite**, séparé d'un retour à la ligne. Rien de ce que l'exploitant a écrit ne disparaît.
  2. Les compteurs, segmentés, chips et anomalies restent **exactement dans l'état où ils
     étaient** — valeurs reportées comprises. Aucune valeur inventée.
  3. Message de repli, style notice (voir §4), affiché dans le bloc dictée.
  4. Le texte transcrit **n'est plus affiché en doublon** en « … » sous le bouton : il est
     désormais dans la note libre, éditable et enregistrable. Deux copies du même texte sur un
     écran dense sont du bruit.

### Distinction des deux causes d'échec de structuration
Même repli dans les deux cas, message différent — dire ce qui s'est passé (brief refonte §7) :
- `navigator.onLine === false` → « Réseau absent »
- en ligne mais l'appel échoue → « Structuration indisponible »

---

## 4. Libellés (finaux)

| Situation | Message | Style |
|---|---|---|
| Repli, hors-ligne | `Réseau absent — vos mots sont conservés dans la note libre. Les compteurs restent à remplir à la main.` | notice |
| Repli, en ligne mais échec | `Structuration indisponible — vos mots sont conservés dans la note libre. Les compteurs restent à remplir à la main.` | notice |
| Échec de transcription | `Transcription impossible — le modèle n'a pas encore été téléchargé sur cet appareil. À faire une fois, avec du réseau.` | erreur |
| Micro refusé | `Micro non autorisé — vérifiez les permissions de l'application.` | erreur |

Règles d'écriture appliquées (brief refonte §7) : verbes à l'infinitif, pas d'excuse, on dit ce
qui s'est passé **et** quoi faire. Le message actuel — « Échec — micro refusé, ou dictée impossible
hors-ligne avant le premier téléchargement du modèle et sans réseau pour la structuration » —
est remplacé : il énumère trois causes possibles sans en trancher aucune, ce qui n'aide personne
gants aux mains.

**Style notice** : `bg-action-bg` / `text-action-ink`, `text-12`, rayon 6px, dans le bloc dictée.
**Style erreur** : `text-11 text-urgent-ink`, comme aujourd'hui.
Aucun jeton nouveau — tout existe déjà dans `src/styles/index.css`.

---

## 5. Interaction avec le correctif « changement de colonie » (prioritaire)

4-COMMIT & DEPLOY est en train de boucher le trou du changement de colonie pendant la dictée :
changer de colonie **annule** la dictée en cours, à toute étape.

**Cette règle prime sur le repli.** Si l'exploitant a changé de colonie pendant la
transcription ou la structuration, le repli **ne doit rien écrire** dans la note libre : la
dictée est abandonnée, point. Écrire les mots dictés pour la ruche 3 dans la note libre de la
ruche 4 serait exactement le défaut qu'on est en train de corriger, sous une autre forme.

À l'implémentation : le repli s'exécute uniquement si la dictée n'a pas été annulée entre-temps.

---

## 6. Ce qui ne change pas

- **Aucune persistance de l'audio.** Le parcours différé existe déjà (Tournée vocale → Revue de
  tournée) ; le réintroduire ici ferait deux chemins concurrents pour le même besoin.
- **Rien n'est persisté avant « Enregistrer ».** Le repli remplit un champ du formulaire, il
  n'écrit pas en base.
- `TourneeVocale.jsx`, `RevueTournee.jsx`, `db/repositories/audio.js`, `structurationIA.js`,
  `transcription.js` : **non modifiés**.
- Le bouton de dictée reste visible et actif hors-ligne. Le masquer supprimerait la fonction
  exactement là où elle sert.

---

## 7. Hors périmètre, volontairement

- **Bouton « Réessayer la structuration » une fois le réseau revenu.** Tentant, mais l'exploitant
  a déjà rempli ses compteurs à la main et tourné la page ; ça ajoute une commande pour un gain
  marginal. À rouvrir si l'usage le réclame.
- **Mise en file d'attente des structurations.** Reviendrait au flux différé, cf. §6.
- **Placement du message d'interruption de dictée** (bas du formulaire → bloc dictée) : arbitré
  **REPORTÉ** par Pierre, à traiter quand L1-L3 seront robustifiés. Ne pas l'anticiper ici.

---

## 8. Limite connue, à signaler telle quelle

Le premier téléchargement du modèle Whisper (~1 Go) **exige du réseau**. Un appareil qui n'a
jamais servi à dicter ne pourra pas dicter au rucher hors-ligne — d'où le message dédié en §4,
qui dit explicitement « à faire une fois, avec du réseau ». Aucun mécanisme de pré-téléchargement
n'est demandé dans ce lot ; si le sujet revient, il relève d'un cadrage à part.

---

## 9. Critères d'acceptation

À vérifier **réellement en navigateur**, pas par lecture de code :

1. Hors-ligne (modèle déjà en cache), dicter une phrase → le texte transcrit se retrouve **dans la
   note libre**, message notice affiché, **aucun compteur modifié**, pas de style erreur.
2. Note libre contenant déjà du texte saisi à la main → le texte dicté s'ajoute **à la suite**,
   l'existant est intact.
3. En ligne, cas nominal → comportement **inchangé** (champs remplis par l'IA, traitements et
   nourrissements détectés listés).
4. Changement de colonie pendant la structuration → **rien** n'est écrit dans la note libre de la
   nouvelle colonie (§5).
5. Échec de transcription → message dédié, **aucune promesse** de mots conservés.
6. Après un repli, « Enregistrer » persiste bien la note libre contenant le texte dicté.

Note pratique pour tester sans micro : `getUserMedia` peut être remplacé par un vrai `MediaStream`
fabriqué via `AudioContext` + `createMediaStreamDestination()` — vraies pistes, vrai
`MediaRecorder`, aucune permission requise. Le hors-ligne se simule via l'onglet Réseau des
outils de développement.
