// Sélection unique parmi une liste pouvant compter plus d'options que
// Segmente ne peut en aligner sur une largeur d'écran (lot L3 : 6 modes de
// saisie récolte, 8 types de mouvement). Même habillage visuel que Chips,
// mais un seul choix actif à la fois plutôt qu'une multi-sélection.
export function SelecteurUnique({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selectionne = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
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
