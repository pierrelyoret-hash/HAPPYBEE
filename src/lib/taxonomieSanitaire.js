// Taxonomie sanitaire partagée (brief L1+ §4, addendum §A.5) — reprise à
// l'identique au niveau cadre (L2.19 "reprise de la taxonomie L1"), donc un
// seul endroit pour ces listes fermées plutôt que dupliquées par écran.
export const SIGNES_SANITAIRES_OPTIONS = [
  { value: 'couvain_mosaique', label: 'Couvain en mosaïque' },
  { value: 'opercules_affaisses', label: 'Opercules affaissés ou percés' },
  { value: 'larves_brunes_visqueuses', label: 'Larves brunes visqueuses adhérentes ⚠' },
  { value: 'larves_flasques_jaune', label: 'Larves flasques jaune clair' },
  { value: 'larves_sac_ecailles_noires', label: 'Larves en sac, écailles noires' },
  { value: 'momies_blanches_grises', label: 'Momies blanches ou grises' },
  { value: 'odeur_colle_putride', label: 'Odeur de colle ou putride ⚠' },
  { value: 'odeur_aigre', label: 'Odeur aigre' },
  { value: 'ailes_deformees', label: 'Ailes déformées' },
  { value: 'varroas_visibles', label: 'Varroas visibles' },
  { value: 'toiles_fausse_teigne', label: 'Toiles ou galeries de fausse teigne' },
  { value: 'coleoptere_noir', label: 'Coléoptère noir dans les rayons ⚠' },
];

export const SIGNES_SANITAIRES_LIBELLES = Object.fromEntries(
  SIGNES_SANITAIRES_OPTIONS.map((o) => [o.value, o.label])
);

// Trois signes déclenchent le parcours danger sanitaire de catégorie 1
// (brief L1+ §5, addendum §A.5 "dangers sanitaires réglementés").
export const SIGNES_CATEGORIE1 = new Set([
  'larves_brunes_visqueuses',
  'odeur_colle_putride',
  'coleoptere_noir',
]);
