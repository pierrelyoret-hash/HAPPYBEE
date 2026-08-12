// Lien de retour compact, répété en haut de chaque écran secondaire en
// plus de celui en pied d'écran, pour ne pas avoir à redescendre tout
// l'écran (demande explicite après le premier test réel sur téléphone).
export function BoutonRetour({ onRetour }) {
  if (!onRetour) return null;
  return (
    <button type="button" onClick={onRetour} className="text-13 text-ink-secondary underline self-start mb-1">
      ← Retour
    </button>
  );
}
