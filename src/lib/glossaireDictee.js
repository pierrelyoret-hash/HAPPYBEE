// Glossaire métier de correction phonétique (L2.5, brief §A.7). Corrige les
// erreurs de reconnaissance les plus probables sur le vocabulaire apicole —
// pas une liste figée : à enrichir avec les erreurs réellement observées à
// l'usage. Enrichi le 13/08/2026 suite à un premier vrai test au rucher
// ("couvins" pour couvain, "cirro" pour sirop, "pivard" pour Apivar).
// [motif reconnu (insensible à la casse), forme correcte]
const CORRECTIONS = [
  [/\bvaro+i?s?\b/gi, 'varroa'],
  [/\bsuper\s?c[ée]dure\b/gi, 'supersédure'],
  [/\bsauve[ts]é\b/gi, 'sauveté'],
  [/\bess?aima?ge\b/gi, 'essaimage'],
  [/\bbourdo?neuse\b/gi, 'bourdonneuse'],
  [/\bor?ph[ée]line\b/gi, 'orpheline'],
  [/\bop[ée]rcul[ée]?\b/gi, 'operculé'],
  [/\bcouvins?\b/gi, 'couvain'],
  [/\bnosh?[ée]mose\b/gi, 'nosémose'],
  [/\bloc?k?e?\s?am[ée]ricaine\b/gi, 'loque américaine'],
  [/\bloc?k?e?\s?europ[ée]enne\b/gi, 'loque européenne'],
  [/\bascospher?ose\b/gi, 'ascosphérose'],
  [/\bcirro\b/gi, 'sirop'],
  // Produits de traitement varroa courants en France — noms de marque,
  // les plus difficiles à reconnaître pour un modèle générique.
  [/\bpivard\b/gi, 'Apivar'],
  [/\ba\s?pi\s?var\b/gi, 'Apivar'],
  [/\bapi\s?gard\b/gi, 'Apiguard'],
  [/\bapi\s?stan\b/gi, 'Apistan'],
  [/\bapi\s?life\s?var\b/gi, 'Apilife Var'],
  [/\bmaqs\b/gi, 'MAQS'],
  [/\bthymo\s?var\b/gi, 'Thymovar'],
  [/\boxy\s?bee\b/gi, 'Oxybee'],
  [/\bvarro\s?med\b/gi, 'VarroMed'],
  [/\bbi\s?oxal\b/gi, 'Api Bioxal'],
  [/\bformic\s?pro\b/gi, 'Formic Pro'],
];

// Un mot répété deux fois de suite (bégaiement, artefact de transcription)
// n'a jamais de sens en français courant ici — on le réduit à une occurrence.
const MOT_REPETE = /\b(\w+)\s+\1\b/gi;

export function corrigerGlossaire(texte) {
  if (!texte) return texte;
  const corrige = CORRECTIONS.reduce((t, [motif, remplacement]) => t.replace(motif, remplacement), texte);
  return corrige.replace(MOT_REPETE, '$1');
}
