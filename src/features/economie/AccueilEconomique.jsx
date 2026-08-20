import { EnTeteEcran } from '../../components/EnTeteEcran.jsx';

// Point d'entrée du module (accueil §6.3 du cadrage UX L4 : tuile "Économique",
// pas un onglet). Hub à quatre destinations, même grammaire que l'écran
// d'accueil général (features/accueil/Accueil.jsx).
export function AccueilEconomique({
  onOuvrirJournal,
  onOuvrirSaisie,
  onOuvrirTableauDeBord,
  onOuvrirImmobilisations,
  onOuvrirTiers,
  onOuvrirComparaison,
  onRetour,
}) {
  return (
    <div className="min-h-screen bg-ground text-ink flex flex-col max-w-3xl mx-auto">
      <EnTeteEcran retourLibelle="← Retour" onRetour={onRetour} titre="Économique" />

      <div className="p-4 flex flex-col gap-3">
        <button type="button" onClick={onOuvrirSaisie} className="h-16 rounded bg-ink text-surface text-15 font-bold flex items-center justify-center">
          + Saisir une écriture
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onOuvrirJournal} className="h-16 rounded bg-surface border border-rule-strong text-ink text-13 font-bold flex items-center justify-center text-center px-2">
            Journal des écritures
          </button>
          <button type="button" onClick={onOuvrirTableauDeBord} className="h-16 rounded bg-miel text-ink text-13 font-bold flex items-center justify-center text-center px-2">
            Tableau de bord
          </button>
          <button type="button" onClick={onOuvrirImmobilisations} className="h-16 rounded bg-surface border border-rule-strong text-ink text-13 font-bold flex items-center justify-center text-center px-2">
            Immobilisations
          </button>
          <button type="button" onClick={onOuvrirTiers} className="h-16 rounded bg-surface border border-rule-strong text-ink text-13 font-bold flex items-center justify-center text-center px-2">
            Fournisseurs / bénéficiaires
          </button>
          <button type="button" onClick={onOuvrirComparaison} className="h-16 rounded bg-surface border border-rule-strong text-ink text-13 font-bold flex items-center justify-center text-center px-2">
            Comparaison pluriannuelle
          </button>
        </div>
      </div>
    </div>
  );
}
