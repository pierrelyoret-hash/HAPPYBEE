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
            aria-pressed={selectionne}
            onClick={() => basculer(option.value)}
            className={`rounded border text-13 h-[34px] px-3 ${
              selectionne ? 'bg-ink border-ink text-surface' : 'bg-surface border-rule-strong text-ink'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
