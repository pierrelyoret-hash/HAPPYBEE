export function declencherTelechargementJson(nomFichier, donnees) {
  const blob = new Blob([JSON.stringify(donnees, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  URL.revokeObjectURL(url);
}
