import { useEffect, useState } from 'react';
import { EnTeteEcran } from '../../components/EnTeteEcran.jsx';
import { listerImmobilisations, creerImmobilisation } from '../../db/repositories/immobilisations.js';

const CHAMP_CLASSE = 'w-full h-11 text-15 border border-rule-strong rounded px-2 bg-surface text-ink';

function dateDuJour() {
  return new Date().toISOString().slice(0, 10);
}

// F6.5 — liste + création directe (une immobilisation peut aussi naître
// d'une écriture "investissement amortissable", voir SaisieEcriture.jsx ;
// ce formulaire couvre le cas où elle est enregistrée sans passer par une
// dépense, ex. héritée d'avant l'usage de l'application).
export function Immobilisations({ onOuvrirFiche, onRetour }) {
  const [immobilisations, setImmobilisations] = useState([]);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [libelle, setLibelle] = useState('');
  const [dateAcquisition, setDateAcquisition] = useState(dateDuJour());
  const [valeurAcquisition, setValeurAcquisition] = useState('');
  const [dureeAmortissement, setDureeAmortissement] = useState('5');
  const [valeurResiduelle, setValeurResiduelle] = useState('');

  async function charger() {
    setImmobilisations(await listerImmobilisations());
  }

  useEffect(() => {
    charger();
  }, []);

  async function enregistrer(e) {
    e.preventDefault();
    await creerImmobilisation({
      libelle: libelle || 'Immobilisation',
      date_acquisition: dateAcquisition,
      valeur_acquisition: Number(valeurAcquisition) || 0,
      duree_amortissement_annees: Number(dureeAmortissement) || 1,
      mode: 'lineaire',
      date_sortie: null,
      valeur_residuelle: valeurResiduelle !== '' ? Number(valeurResiduelle) : null,
      justificatif_document_id: null,
    });
    setLibelle('');
    setValeurAcquisition('');
    setValeurResiduelle('');
    setFormulaireOuvert(false);
    await charger();
  }

  return (
    <div className="min-h-screen bg-ground text-ink flex flex-col max-w-3xl mx-auto">
      <EnTeteEcran
        retourLibelle="← Retour"
        onRetour={onRetour}
        titre="Immobilisations"
        droite={
          <button type="button" onClick={() => setFormulaireOuvert((v) => !v)} className="h-11 px-3 rounded bg-ink text-surface text-13 font-bold">
            + Immobilisation
          </button>
        }
      />

      <div className="p-4 flex flex-col gap-4">
        {formulaireOuvert && (
          <form onSubmit={enregistrer} className="flex flex-col gap-3 bg-surface border border-rule rounded p-3">
            <input type="text" placeholder="Libellé" className={CHAMP_CLASSE} value={libelle} onChange={(e) => setLibelle(e.target.value)} autoFocus />
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[140px]">
                <label className="text-13 text-ink-secondary mb-1 block">Date d'acquisition</label>
                <input type="date" className={CHAMP_CLASSE} value={dateAcquisition} onChange={(e) => setDateAcquisition(e.target.value)} />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="text-13 text-ink-secondary mb-1 block">Valeur d'acquisition (€)</label>
                <input type="number" step="0.01" className={CHAMP_CLASSE} value={valeurAcquisition} onChange={(e) => setValeurAcquisition(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[140px]">
                <label className="text-13 text-ink-secondary mb-1 block">Durée d'amortissement (années)</label>
                <input type="number" min="1" className={CHAMP_CLASSE} value={dureeAmortissement} onChange={(e) => setDureeAmortissement(e.target.value)} />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="text-13 text-ink-secondary mb-1 block">Valeur résiduelle (€)</label>
                <input type="number" step="0.01" className={CHAMP_CLASSE} value={valeurResiduelle} onChange={(e) => setValeurResiduelle(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="h-11 self-start px-4 rounded bg-ink text-surface text-13 font-bold">
              Enregistrer
            </button>
          </form>
        )}

        <div className="flex flex-col gap-2">
          {immobilisations.length === 0 && <p className="text-13 text-ink-secondary">Aucune immobilisation enregistrée.</p>}
          {immobilisations.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => onOuvrirFiche(i.id)}
              className="flex items-center justify-between gap-3 bg-surface border border-rule rounded p-3 text-left"
            >
              <div>
                <p className="text-15 font-bold">{i.libelle}</p>
                <p className="text-11 text-ink-secondary">
                  Acquise le {i.date_acquisition} · {i.duree_amortissement_annees} ans
                </p>
              </div>
              <p className="text-15 font-mono font-bold">{i.valeur_acquisition.toFixed(2)} €</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
