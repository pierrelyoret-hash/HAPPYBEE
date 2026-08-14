// Libellés partagés entre l'écran de saisie cadre par cadre et son
// historique (lot L2, extrait le 14/08/2026 pour que les deux écrans
// affichent exactement le même vocabulaire — cause d'une partie de la
// confusion remontée entre "Ponte" et "Œufs").
export const TYPE_CADRE_LIBELLES = {
  bati: 'Bâti',
  gaufre_neuf: 'Gaufré neuf',
  amorce: 'Amorce',
  naturel: 'Naturel',
  partition: 'Partition',
  nourrisseur: 'Nourrisseur',
};

// Occupation des surfaces en pourcentages (§A.3, converti depuis les
// huitièmes le 14/08/2026) — une ligne par champ, dans l'ordre d'affichage.
export const CHAMPS_OCCUPATION = [
  ['couvain_opercule', 'Couvain operculé'],
  ['couvain_ouvert', 'Couvain ouvert'],
  ['oeufs', 'Œufs'],
  ['miel_opercule', 'Miel operculé'],
  ['nectar_frais', 'Nectar frais'],
  ['pollen', 'Pollen'],
  ['cellules_vides', 'Cellules vides'],
  ['non_bati', 'Non bâti'],
  ['couvain_male', 'Couvain de mâles'],
];

export const PONTE_ECHELLE_LIBELLES = {
  1: 'très dispersée, mosaïque',
  2: 'lacunaire, nombreux trous',
  3: 'correcte, cellules vides dispersées',
  4: 'compacte, quelques cellules vides',
  5: 'très compacte, ≥ 90 % des cellules operculées',
};
export const PONTE_ECHELLE_LEGENDE = '1 dispersée · 5 très compacte — qualité, pas une surface';

export const CELLULES_ROYALES_TYPE_LIBELLES = {
  essaimage: 'Essaimage',
  supersedure: 'Supersédure',
  sauvete: 'Sauveté',
};

export const CELLULES_ROYALES_POS_LIBELLES = {
  bord_inferieur: 'Bord inférieur',
  bord_lateral: 'Bord latéral',
  pleine_surface: 'Pleine surface',
};
