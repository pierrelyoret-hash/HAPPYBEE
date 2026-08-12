// Correction écrans L1 rang 2 (bloquant) : une valeur reportée ne doit
// jamais se rendre comme une sélection active. Conforme à l'addendum
// ergonomie §3 : "reporté" = grisé jusqu'à confirmation, jamais coloré
// comme "saisi". Sélecteur segmenté (brief refonte §5) : pas de teinte,
// état actif en encre pleine — seul un appui de l'utilisateur obtient
// cette couleur.
export function Segmente({ options, value, provenance, referenceDate, libelles, legende, onChange }) {
  const estReporte = provenance === 'reporte';

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        {options.map((option) => {
          const selectionne = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              onClick={() => onChange(option.value)}
              className={`flex-1 h-10 rounded text-13 font-bold border ${
                selectionne
                  ? estReporte
                    ? 'bg-surface-sunk border-rule-strong text-ink-muted'
                    : 'bg-ink border-ink text-surface'
                  : 'bg-surface border-rule-strong text-ink'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <span className="text-11 text-ink-muted h-3">
        {estReporte && referenceDate
          ? `visite du ${referenceDate}`
          : value != null && libelles
            ? libelles[value]
            : legende}
      </span>
    </div>
  );
}
