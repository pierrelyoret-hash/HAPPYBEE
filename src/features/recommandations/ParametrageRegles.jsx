import { useEffect, useState } from 'react';
import { EnTeteEcran } from '../../components/EnTeteEcran.jsx';
import { Interrupteur } from '../../components/Interrupteur.jsx';
import { listerToutesRegles, modifierRegle } from '../../db/repositories/regles.js';

const CHAMP_CLASSE =
  'w-20 h-9 text-14 border border-rule-strong rounded px-2 bg-surface text-ink text-right';

// F12.8/F12.9 (§7 du brief) : seuils par règle, activation/désactivation.
// Écran de réglage, pas un parcours terrain — accessible depuis l'accueil,
// jamais depuis la saisie.
//
// Seules les règles portant parametres_defaut exposent des seuils
// modifiables ici (R-CLIM-01, R-CLIM-02, R-VARR-03, R-NOUR-01, R-NOUR-02,
// R-ESSA-02) — R-REGL-02 (fenêtre calendaire) et R-ORPH-01 (aucun seuil
// numérique, déclenchée par une anomalie de visite) n'ont que
// l'activation/désactivation.
function CarteRegle({ regle, onChange }) {
  const seuils = regle.parametres_utilisateur ?? regle.parametres_defaut;
  const [valeurs, setValeurs] = useState(seuils ?? {});

  async function basculerActive() {
    await modifierRegle(regle.id, { active: !regle.active });
    onChange();
  }

  function modifierChamp(cle, valeur) {
    setValeurs((v) => ({ ...v, [cle]: valeur === '' ? '' : Number(valeur) }));
  }

  async function enregistrerSeuils() {
    await modifierRegle(regle.id, { parametres_utilisateur: valeurs });
    onChange();
  }

  async function reinitialiser() {
    setValeurs(regle.parametres_defaut ?? {});
    await modifierRegle(regle.id, { parametres_utilisateur: null });
    onChange();
  }

  const modifie = regle.parametres_utilisateur != null;

  return (
    <div className="bg-surface border border-rule rounded p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-14 font-bold text-ink">{regle.code}</p>
          <p className="text-11 text-ink-muted">{regle.famille}</p>
        </div>
        <div className="w-32 shrink-0">
          <Interrupteur label="Active" value={regle.active} provenance="saisi" onChange={basculerActive} />
        </div>
      </div>

      {regle.parametres_defaut && (
        <div className="flex flex-col gap-2 pt-2 border-t border-rule">
          {Object.keys(regle.parametres_defaut).map((cle) => (
            <div key={cle} className="flex items-center justify-between gap-2">
              <label htmlFor={`${regle.id}-${cle}`} className="text-12 text-ink-secondary">
                {cle}
              </label>
              <input
                id={`${regle.id}-${cle}`}
                type="number"
                className={CHAMP_CLASSE}
                value={valeurs[cle] ?? ''}
                onChange={(e) => modifierChamp(cle, e.target.value)}
              />
            </div>
          ))}
          <div className="flex gap-2">
            <button type="button" onClick={enregistrerSeuils} className="flex-1 h-9 rounded bg-ink text-surface text-12 font-bold">
              Enregistrer
            </button>
            {modifie && (
              <button type="button" onClick={reinitialiser} className="flex-1 h-9 rounded bg-surface border border-rule-strong text-ink text-12 font-bold">
                Réinitialiser
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ParametrageRegles({ onRetour }) {
  const [regles, setRegles] = useState(null);

  async function charger() {
    setRegles(await listerToutesRegles());
  }

  useEffect(() => {
    charger();
  }, []);

  if (regles === null) return null;

  return (
    <div className="min-h-screen bg-ground text-ink flex flex-col max-w-md mx-auto pb-14">
      <EnTeteEcran retourLibelle="← Retour" onRetour={onRetour} titre="Paramétrage des règles" />

      <div className="p-4 flex flex-col gap-3">
        {regles.length === 0 && <p className="text-13 text-ink-secondary">Aucune règle enregistrée.</p>}
        {regles.map((regle) => (
          <CarteRegle key={regle.id} regle={regle} onChange={charger} />
        ))}

        {onRetour && (
          <button type="button" onClick={onRetour} className="h-12 w-full text-13 text-ink-secondary underline">
            Retour
          </button>
        )}
      </div>
    </div>
  );
}
