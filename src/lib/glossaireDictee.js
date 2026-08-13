// Glossaire métier de correction phonétique (L2.5, brief §A.7). Corrige les
// erreurs de reconnaissance les plus probables sur le vocabulaire apicole —
// pas une liste figée : à enrichir avec les erreurs réellement observées à
// l'usage, aucun échantillon audio réel n'existait au moment de l'écrire.
// [motif reconnu (insensible à la casse), forme correcte]
const CORRECTIONS = [
  [/\bvaro+i?s?\b/gi, 'varroa'],
  [/\bsuper\s?c[ée]dure\b/gi, 'supersédure'],
  [/\bsauve[ts]é\b/gi, 'sauveté'],
  [/\bess?aima?ge\b/gi, 'essaimage'],
  [/\bbourdo?neuse\b/gi, 'bourdonneuse'],
  [/\bor?ph[ée]line\b/gi, 'orpheline'],
  [/\bop[ée]rcul[ée]?\b/gi, 'operculé'],
  [/\bnosh?[ée]mose\b/gi, 'nosémose'],
  [/\bloc?k?e?\s?am[ée]ricaine\b/gi, 'loque américaine'],
  [/\bloc?k?e?\s?europ[ée]enne\b/gi, 'loque européenne'],
  [/\bascospher?ose\b/gi, 'ascosphérose'],
];

export function corrigerGlossaire(texte) {
  if (!texte) return texte;
  return CORRECTIONS.reduce((t, [motif, remplacement]) => t.replace(motif, remplacement), texte);
}
