// Multi-sélection, jamais pré-cochée (§3 addendum ergonomie — les anomalies
// ne sont jamais reportées d'une visite à l'autre).
export function Chips({ options, value, onChange }) {
  function basculer(optionValue) {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selectionne = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => basculer(option.value)}
            className={`rounded-full border text-sm py-[7px] px-[11px] ${
              selectionne
                ? 'bg-amber-100 border-amber-400 text-amber-800'
                : 'bg-white border-gray-300 text-gray-700'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
