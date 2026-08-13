// Compression côté navigateur (§3.3 "PDF | Génération côté navigateur" —
// même logique appliquée ici : aucune dépendance serveur). Redimensionne
// au plus grand côté et ré-encode en JPEG qualité réduite via Canvas — pas
// de librairie, l'API est suffisante pour ce besoin.
const COTE_MAX_DEFAUT = 1600;
const QUALITE_DEFAUT = 0.75;

async function chargerImage(fichier) {
  const url = URL.createObjectURL(fichier);
  try {
    const image = new Image();
    image.src = url;
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function comprimerImage(fichier, { coteMax = COTE_MAX_DEFAUT, qualite = QUALITE_DEFAUT } = {}) {
  const image = await chargerImage(fichier);
  const ratio = Math.min(1, coteMax / Math.max(image.width, image.height));
  const largeur = Math.round(image.width * ratio);
  const hauteur = Math.round(image.height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = largeur;
  canvas.height = hauteur;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, largeur, hauteur);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', qualite));
  // Si la compression échoue (ex. canvas vide), on retombe sur le fichier
  // d'origine plutôt que de bloquer l'ajout de la photo.
  return blob ?? fichier;
}
