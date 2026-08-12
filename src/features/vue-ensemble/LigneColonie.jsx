import { useRef } from 'react';
import { PastilleEtat } from '../../components/PastilleEtat.jsx';

// Distinction vide / zéro impérative (brief refonte §5) : "—" = non
// observé, "0" = observé, aucun cadre. Ne jamais confondre les deux.
function metrique(valeur) {
  return valeur == null ? '—' : String(valeur);
}

function anciennete(jours) {
  if (jours == null) return 'jamais visitée';
  if (jours === 0) return "vue aujourd'hui";
  return `vue il y a ${jours} j`;
}

const DUREE_APPUI_LONG = 500;

// Ligne de colonie — élément signature de l'application (brief refonte
// visuelle §5). Toute la ligne est cliquable et ouvre la visite ; un appui
// long sur le badge de numéro entre en mode réordonnancement (correction
// écrans L1, rang 9) sans déclencher l'ouverture de la visite.
export function LigneColonie({
  ligne,
  modeEdition,
  premiere,
  derniere,
  onOuvrirVisite,
  onEntrerModeEdition,
  onDeplacer,
}) {
  const minuteur = useRef(null);
  const appuiLongDeclenche = useRef(false);

  function debuterAppui() {
    appuiLongDeclenche.current = false;
    minuteur.current = setTimeout(() => {
      appuiLongDeclenche.current = true;
      onEntrerModeEdition();
    }, DUREE_APPUI_LONG);
  }

  function annulerAppui() {
    clearTimeout(minuteur.current);
  }

  function gererClicLigne() {
    if (appuiLongDeclenche.current) {
      // L'appui long a déjà déclenché le mode édition : ne pas ouvrir la visite.
      appuiLongDeclenche.current = false;
      return;
    }
    if (modeEdition) return;
    onOuvrirVisite(ligne.colonie.id);
  }

  const estUrgent = ligne.etat === 'urgent';
  const estAction = ligne.etat === 'action';
  // La ligne de note ne s'affiche que sur Action ou Urgent (brief §5) :
  // sur toutes les lignes, elle banaliserait l'exception qui doit sauter aux yeux.
  const note = (estUrgent || estAction) ? ligne.derniereVisite?.observation_libre : null;

  return (
    <li
      className={`flex items-stretch gap-3 px-3 ${note ? 'py-3' : 'py-2'} ${
        estUrgent ? 'bg-urgent-bg' : ''
      }`}
      style={{ minHeight: note ? 88 : 64 }}
    >
      <button
        type="button"
        onPointerDown={debuterAppui}
        onPointerUp={annulerAppui}
        onPointerLeave={annulerAppui}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Ruche ${ligne.ruche.numero}${modeEdition ? ' — appui long pour quitter le mode réordonnancement' : ' — appui long pour réordonner'}`}
        className={`shrink-0 w-7 h-7 self-center rounded-full flex items-center justify-center font-mono text-13 font-bold ${
          estUrgent
            ? 'bg-urgent-ink text-surface'
            : 'bg-surface-sunk text-ink'
        }`}
      >
        {ligne.ruche.numero}
      </button>

      {modeEdition ? (
        <div className="flex-1 flex items-center justify-between gap-2">
          <p className="text-13 text-ink-secondary">Ruche {ligne.ruche.numero}</p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onDeplacer(-1)}
              disabled={premiere}
              className="w-11 h-11 rounded border border-rule-strong bg-surface disabled:opacity-30"
              aria-label="monter dans la tournée"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => onDeplacer(1)}
              disabled={derniere}
              className="w-11 h-11 rounded border border-rule-strong bg-surface disabled:opacity-30"
              aria-label="descendre dans la tournée"
            >
              ↓
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={gererClicLigne} className="flex-1 text-left flex flex-col justify-center gap-0.5 min-w-0">
          <span className="flex items-baseline justify-between gap-2">
            <span className={`text-13 font-bold truncate ${estUrgent ? 'text-urgent-ink' : 'text-ink'}`}>
              Ruche {ligne.ruche.numero}
            </span>
            <PastilleEtat etat={ligne.etat} />
          </span>
          <span className="font-mono text-12 text-ink-secondary whitespace-nowrap">
            {metrique(ligne.couvain)} couvain · {metrique(ligne.provisions)} provis. · {anciennete(ligne.joursDepuisVisite)}
          </span>
          {note && (
            <span className="text-12 italic text-ink-secondary truncate">« {note} »</span>
          )}
        </button>
      )}
    </li>
  );
}
