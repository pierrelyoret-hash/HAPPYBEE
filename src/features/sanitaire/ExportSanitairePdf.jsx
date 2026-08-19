import { useState } from 'react';
import { EnTeteEcran } from '../../components/EnTeteEcran.jsx';
import { listerDonneesExportPdf } from '../../db/repositories/sanitaire.js';
import { genererPdfSanitaire } from '../../lib/pdfSanitaire.js';

function dateDuJour() {
  return new Date().toISOString().slice(0, 10);
}

function premierJanvier() {
  return `${new Date().getFullYear()}-01-01`;
}

const CHAMP_CLASSE =
  'w-full h-11 text-15 border border-rule-strong rounded px-2 bg-surface text-ink';

// Sélection de période (brief §2 point 8, cohérent F5.3) — par défaut
// l'exercice en cours, ici l'année civile. Ce n'est PAS un pis-aller technique
// faute de mieux : le registre sanitaire (F5.1, arrêté du 5 juin 2000) se
// tient par année civile, à ne surtout pas aligner sur la "campagne apicole
// avril-mars" utilisée ailleurs (historique consolidé, export CSV) — les
// deux découpages coexistent volontairement, chacun pour son usage.
export function ExportSanitairePdf({ onRetour }) {
  const [periodeDebut, setPeriodeDebut] = useState(premierJanvier());
  const [periodeFin, setPeriodeFin] = useState(dateDuJour());
  const [message, setMessage] = useState(null);

  async function generer() {
    try {
      const { traitements, comptages, ruchesParColonie } = await listerDonneesExportPdf(
        periodeDebut,
        periodeFin
      );
      const doc = genererPdfSanitaire({
        traitements,
        comptages,
        ruchesParColonie,
        periodeDebut,
        periodeFin,
      });
      doc.save(`happybee-sanitaire-${periodeDebut}-au-${periodeFin}.pdf`);
      setMessage(
        `PDF généré (${traitements.length} traitement(s), ${comptages.length} comptage(s)).`
      );
    } catch (err) {
      console.error('[sanitaire] échec export PDF', err);
      setMessage("Erreur : le PDF n'a pas pu être généré.");
    }
  }

  return (
    <div className="min-h-screen bg-ground text-ink flex flex-col max-w-md mx-auto">
      <EnTeteEcran retourLibelle="← Retour" onRetour={onRetour} titre="Export PDF sanitaire" />

      <div className="p-4 flex flex-col gap-4">

      <p className="text-13 text-ink-secondary">
        Couvre les traitements et les comptages varroa. Ce n'est pas le registre d'élevage
        complet.
      </p>

      <section className="flex flex-col gap-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-13 text-ink-secondary mb-1 block" htmlFor="periode_debut">
              Du
            </label>
            <input
              id="periode_debut"
              type="date"
              className={CHAMP_CLASSE}
              value={periodeDebut}
              onChange={(e) => setPeriodeDebut(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="text-13 text-ink-secondary mb-1 block" htmlFor="periode_fin">
              Au
            </label>
            <input
              id="periode_fin"
              type="date"
              className={CHAMP_CLASSE}
              value={periodeFin}
              onChange={(e) => setPeriodeFin(e.target.value)}
            />
          </div>
        </div>
      </section>

      {message && <p className="text-13 text-center text-ink-secondary">{message}</p>}

      <button
        type="button"
        onClick={generer}
        className="h-[46px] w-full rounded bg-ink text-surface text-15 font-bold"
      >
        Générer le PDF
      </button>

      {onRetour && (
        <button
          type="button"
          onClick={onRetour}
          className="h-12 w-full text-13 text-ink-secondary underline"
        >
          Retour
        </button>
      )}
      </div>
    </div>
  );
}
