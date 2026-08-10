export function Segmente({ options, value, provenance, referenceDate, onChange }) {
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
              className={`flex-1 h-10 rounded text-sm font-medium border ${
                selectionne
                  ? estReporte
                    ? 'bg-green-100 border-green-400 text-green-700'
                    : 'bg-green-600 border-green-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <span className="text-[11px] text-gray-500 h-3">
        {estReporte && referenceDate && `visite du ${referenceDate}`}
      </span>
    </div>
  );
}
