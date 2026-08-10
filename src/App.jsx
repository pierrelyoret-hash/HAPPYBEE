import { useState } from 'react';
import { VueEnsemble } from './features/vue-ensemble';
import { SaisieVisite } from './features/saisie-visite';
import { Historique } from './features/historique';

export function App() {
  const [ecran, setEcran] = useState('vue_ensemble');
  const [colonieSelectionnee, setColonieSelectionnee] = useState(null);

  function ouvrirSaisie(colonieId) {
    setColonieSelectionnee(colonieId);
    setEcran('saisie_visite');
  }

  function ouvrirHistorique(colonieId) {
    setColonieSelectionnee(colonieId);
    setEcran('historique');
  }

  function retourVueEnsemble() {
    setEcran('vue_ensemble');
  }

  if (ecran === 'saisie_visite') {
    return (
      <SaisieVisite colonieInitialeId={colonieSelectionnee} onRetour={retourVueEnsemble} />
    );
  }

  if (ecran === 'historique') {
    return <Historique colonieId={colonieSelectionnee} onRetour={retourVueEnsemble} />;
  }

  return <VueEnsemble onOuvrirVisite={ouvrirSaisie} onOuvrirHistorique={ouvrirHistorique} />;
}
