// Provenance : 'saisi' | 'reporte' | 'vide'. En 'reporte', la valeur est
// affichée en grisé jusqu'à ce que l'utilisateur y touche (§3 addendum
// ergonomie) ; en 'vide', aucune visite précédente n'existe pour ce champ.
//
// Disposition en ligne — libellé à gauche, contrôle à droite (correction
// écrans L1 §1) : sans libellé, rien ne distingue les trois compteurs.
// Cadre à filet unique (correction écrans L1 §9.3) : libellé et contrôle
// dans le même bloc visuel, pour que l'association soit immédiate au regard.
export function Compteur({ label, value, min = 0, max = 12, provenance, referenceDate, onChange }) {
  const affichee = value ?? min;
  const estVide = provenance === 'vide';
  const estReporte = provenance === 'reporte';

  const diminuer = () => onChange(Math.max(min, affichee - 1));
  const augmenter = () => onChange(Math.min(max, affichee + 1));

  return (
    <div className="flex items-center justify-between gap-3 border border-rule rounded p-2">
      <div className="flex flex-col">
        <span className="text-13 text-ink-secondary">{label}</span>
        <span className="font-mono text-11 text-ink-muted h-3">
          {estVide && 'non observé'}
          {estReporte && referenceDate && `${affichee} le ${referenceDate}`}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={diminuer}
          className="w-11 h-11 rounded bg-surface-sunk text-2xl leading-none active:bg-rule"
          aria-label="diminuer"
        >
          –
        </button>
        <span
          className={`font-mono text-20 w-8 text-center tabular-nums ${
            estReporte ? 'text-ink-muted' : 'text-ink'
          }`}
        >
          {estVide ? '·' : affichee}
        </span>
        <button
          type="button"
          onClick={augmenter}
          className="w-11 h-11 rounded bg-surface-sunk text-2xl leading-none active:bg-rule"
          aria-label="augmenter"
        >
          +
        </button>
      </div>
    </div>
  );
}
