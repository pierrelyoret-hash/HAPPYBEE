// Catégories pré-remplies au premier lancement (brief_L4_economique.md §5 :
// "une liste vide oblige à créer une catégorie avant la première écriture,
// ce qui décourage la saisie dès le premier geste"). Le cahier des charges
// (§4.3) et le brief L4 ne fixent que les groupes, pas les libellés — une
// catégorie par groupe est la proposition la plus simple qui couvre le
// périmètre demandé ; l'exploitant peut en ajouter, en renommer ou en
// désactiver librement ensuite, rien n'est figé par ce fichier au-delà du
// premier démarrage.
export const CATEGORIES_PAR_DEFAUT = [
  // Dépense
  { libelle: 'Achat de cheptel (essaims, reines)', sens: 'depense', groupe: 'cheptel' },
  { libelle: 'Matériel apicole', sens: 'depense', groupe: 'materiel' },
  { libelle: 'Intrants sanitaires', sens: 'depense', groupe: 'intrants_sanitaires' },
  { libelle: 'Nourrissement', sens: 'depense', groupe: 'nourrissement' },
  { libelle: 'Conditionnement (pots, étiquettes, fûts)', sens: 'depense', groupe: 'conditionnement' },
  { libelle: 'Déplacement', sens: 'depense', groupe: 'deplacement' },
  { libelle: 'Formation', sens: 'depense', groupe: 'formation' },
  { libelle: 'Assurance', sens: 'depense', groupe: 'assurance' },
  { libelle: 'Cotisations (syndicat, GDSA...)', sens: 'depense', groupe: 'cotisations' },
  { libelle: 'Divers', sens: 'depense', groupe: 'divers' },
  // Produit
  { libelle: 'Vente de miel', sens: 'produit', groupe: 'vente_miel' },
  { libelle: 'Vente de cire', sens: 'produit', groupe: 'vente_cire' },
  { libelle: "Vente d'essaims", sens: 'produit', groupe: 'vente_essaims' },
  { libelle: 'Prestation (pollinisation, formation...)', sens: 'produit', groupe: 'prestation' },
  { libelle: 'Aide / subvention', sens: 'produit', groupe: 'aide' },
  { libelle: 'Don', sens: 'produit', groupe: 'don' },
];
