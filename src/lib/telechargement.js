function declencherTelechargement(nomFichier, blob) {
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  URL.revokeObjectURL(url);
}

export function declencherTelechargementJson(nomFichier, donnees) {
  declencherTelechargement(
    nomFichier,
    new Blob([JSON.stringify(donnees, null, 2)], { type: 'application/json' })
  );
}

// BOM UTF-8 (U+FEFF) : sans lui, Excel ouvre un CSV UTF-8 accentué en
// Windows-1252 et abîme les caractères français dès le premier essai.
const BOM_UTF8 = '﻿';
export function declencherTelechargementCsv(nomFichier, texteCsv) {
  declencherTelechargement(
    nomFichier,
    new Blob([BOM_UTF8 + texteCsv], { type: 'text/csv;charset=utf-8' })
  );
}
