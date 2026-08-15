// Bandeau d'en-tête partagé (refonte visuelle, DESIGN/design_handoff_happybee_refonte/README.md
// §2) — remplace `<header>` + BoutonRetour en haut de chaque écran. Le miel
// devient ici une couleur de structure (bandeau, navigation), jamais une
// couleur d'état : les pastilles urgent/action/à visiter/normale gardent
// leur palette pastel, inchangée.
export function EnTeteEcran({ titre, contexte, retourLibelle, onRetour, droite, progression, children }) {
  return (
    <header className="bg-miel px-4 pt-2.5 pb-3.5 flex flex-col gap-2">
      {onRetour && (
        <button
          type="button"
          onClick={onRetour}
          className="self-start text-13 text-sur-miel underline pb-1 min-h-11 flex items-center"
        >
          {retourLibelle ?? '← Retour'}
        </button>
      )}
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-20 font-bold text-ink leading-tight">{titre}</div>
        {droite && <div className="shrink-0">{droite}</div>}
      </div>
      {contexte && <div className="font-mono text-11 font-bold text-sur-miel uppercase">{contexte}</div>}
      {children}
      {progression && (
        <div className="h-1.5 rounded bg-[rgba(26,26,23,0.2)] overflow-hidden">
          <div
            className="h-full bg-vert transition-[width] duration-[.35s] ease-in-out"
            style={{ width: `${(progression.fait / progression.total) * 100}%` }}
          />
        </div>
      )}
    </header>
  );
}
