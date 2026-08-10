import { useState } from 'react';
import { VueEnsemble } from './features/vue-ensemble';
import { SaisieVisite } from './features/saisie-visite';

export function App() {
  const [ecran, setEcran] = useState('vue_ensemble');
  const [colonieSelectionnee, setColonieSelectionnee] = useState(null);

  function ouvrirSaisie(colonieId) {
    setColonieSelectionnee(colonieId);
    setEcran('saisie_visite');
  }

  function retourVueEnsemble() {
    setEcran('vue_ensemble');
  }

  if (ecran === 'saisie_visite') {
    return (
      <SaisieVisite colonieInitialeId={colonieSelectionnee} onRetour={retourVueEnsemble} />
    );
  }

  return <VueEnsemble onOuvrirVisite={ouvrirSaisie} />;
}
