import { useState } from 'react';
import { VueEnsemble } from './features/vue-ensemble';
import { SaisieVisite } from './features/saisie-visite';
import { Historique } from './features/historique';
import { ImportCsv } from './features/import-csv';
import { Restauration } from './features/restauration';

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

  function ouvrirImport() {
    setEcran('import_csv');
  }

  function ouvrirRestauration() {
    setEcran('restauration');
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

  if (ecran === 'import_csv') {
    return <ImportCsv onRetour={retourVueEnsemble} />;
  }

  if (ecran === 'restauration') {
    return <Restauration onRetour={retourVueEnsemble} />;
  }

  return (
    <VueEnsemble
      onOuvrirVisite={ouvrirSaisie}
      onOuvrirHistorique={ouvrirHistorique}
      onOuvrirImport={ouvrirImport}
      onOuvrirRestauration={ouvrirRestauration}
    />
  );
}
