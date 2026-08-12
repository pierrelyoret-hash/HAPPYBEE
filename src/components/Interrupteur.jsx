// Correction écrans L1 §9.2 : remplace les paires Oui/Non (quatre boutons
// pour deux booléens) par un interrupteur unique. Trois positions gérées
// (pas deux) pour préserver la distinction vide / saisi (§3 addendum
// ergonomie) : centré et non teinté = non observé, jamais confondu avec
// "Non". Un appui bascule entre Oui et Non ; l'état "non observé" ne se
// revoit qu'en changeant de visite.
export function Interrupteur({ label, value, provenance, referenceDate, onChange }) {
  const estVide = provenance === 'vide';
  const estReporte = provenance === 'reporte';

  // Piste 56px, curseur 24px, ancré à left-1 (4px) : la course va de
  // translate-x-0 (bord gauche) à translate-x-6 = 24px (bord droit, car
  // 56 − 24 − 2×4 = 24). Sans ancrage explicite (left-1), le curseur se
  // positionnait hors de la piste — bug constaté à l'écran, corrigé ici.
  let position = 'translate-x-3'; // centré : vide (moitié de la course)
  if (value === true) position = 'translate-x-6';
  if (value === false) position = 'translate-x-0';

  let piste = 'bg-surface border border-dashed border-rule-strong'; // vide
  if (!estVide) {
    if (estReporte) {
      piste = 'bg-surface-sunk border border-rule';
    } else {
      piste = value ? 'bg-ink border border-ink' : 'bg-surface-sunk border border-rule-strong';
    }
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-col">
        <span className="text-13 text-ink-secondary">{label}</span>
        <span className="text-11 text-ink-muted h-3">
          {estVide && 'non observé'}
          {estReporte && referenceDate && `${value ? 'oui' : 'non'} le ${referenceDate}`}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value === true}
        aria-label={label}
        onClick={() => onChange(!(value === true))}
        className={`w-14 h-8 rounded-full relative shrink-0 ${piste}`}
      >
        <span
          className={`absolute left-1 top-1 w-6 h-6 rounded-full bg-surface border border-rule-strong transition-transform ${position}`}
        />
      </button>
    </div>
  );
}
