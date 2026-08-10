// Provenance : 'saisi' | 'reporte' | 'vide'. En 'reporte', la valeur est
// affichée en grisé jusqu'à ce que l'utilisateur y touche (§3 addendum
// ergonomie) ; en 'vide', aucune visite précédente n'existe pour ce champ.
export function Compteur({ value, min = 0, max = 12, provenance, referenceDate, onChange }) {
  const affichee = value ?? min;
  const estVide = provenance === 'vide';
  const estReporte = provenance === 'reporte';

  const diminuer = () => onChange(Math.max(min, affichee - 1));
  const augmenter = () => onChange(Math.min(max, affichee + 1));

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={diminuer}
          className="w-10 h-10 rounded bg-gray-200 text-2xl leading-none active:bg-gray-300"
          aria-label="diminuer"
        >
          –
        </button>
        <span
          className={`text-xl w-8 text-center tabular-nums ${
            estReporte ? 'text-gray-400' : 'text-gray-900'
          }`}
        >
          {estVide ? '·' : affichee}
        </span>
        <button
          type="button"
          onClick={augmenter}
          className="w-10 h-10 rounded bg-gray-200 text-2xl leading-none active:bg-gray-300"
          aria-label="augmenter"
        >
          +
        </button>
      </div>
      <span className="text-[11px] text-gray-500 h-3">
        {estVide && 'non observé'}
        {estReporte && referenceDate && `visite du ${referenceDate}`}
      </span>
    </div>
  );
}
