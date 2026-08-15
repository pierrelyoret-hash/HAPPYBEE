// Barre d'onglets basse (refonte visuelle, DESIGN/design_handoff_happybee_refonte/README.md
// §6) — remplace la navigation par pile sur les écrans de premier niveau
// uniquement (Rucher/Tâches/Météo) ; les écrans poussés (saisie, historique,
// sanitaire…) gardent leur retour habituel dans EnTeteEcran et n'affichent
// pas cette barre. « Registre » (4e onglet de la maquette d'origine) reporté :
// aucun écran existant ne correspond encore à ce concept, pas de nouvelle
// fonctionnalité inventée pour ce lot.
//
// Positionnement fixe en bas de viewport : les écrans qui l'affichent
// réservent l'espace nécessaire (pb-14) sur leur conteneur racine pour que
// leurs propres boutons de pied d'écran ne se retrouvent pas cachés dessous.
const ONGLETS = [
  { cle: 'rucher', libelle: 'Rucher' },
  { cle: 'taches', libelle: 'Tâches' },
  { cle: 'meteo', libelle: 'Météo' },
];

function IconeOnglet({ cle }) {
  if (cle === 'rucher') {
    return <span className="block w-3.5 h-3.5 rounded-[3px] border-2 border-current" aria-hidden="true" />;
  }
  if (cle === 'taches') {
    return <span className="block w-3.5 h-3.5 rounded-full border-2 border-current" aria-hidden="true" />;
  }
  return (
    <span className="block w-3.5 h-3.5 border-2 border-current rotate-45" aria-hidden="true" />
  );
}

export function BarreOnglets({ actif, onNaviguer }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-surface border-t border-rule-strong">
      <div className="max-w-md mx-auto grid grid-cols-3">
        {ONGLETS.map((onglet) => {
          const estActif = onglet.cle === actif;
          return (
            <button
              key={onglet.cle}
              type="button"
              onClick={() => onNaviguer(onglet.cle)}
              className={`h-14 flex flex-col items-center justify-center gap-1 border-t-[3px] ${
                estActif ? 'border-miel text-ink font-bold' : 'border-transparent text-ink-secondary'
              }`}
            >
              <IconeOnglet cle={onglet.cle} />
              <span className="text-[10px] leading-none">{onglet.libelle}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
