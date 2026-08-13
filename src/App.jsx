import { useState } from 'react';
import { VueEnsemble } from './features/vue-ensemble';
import { SaisieVisite } from './features/saisie-visite';
import { Historique } from './features/historique';
import { ImportCsv } from './features/import-csv';
import { Restauration } from './features/restauration';
import {
  HistoriqueSanitaire,
  SaisieTraitement,
  SaisieComptageVarroa,
  SaisieNourrissement,
  ExportSanitairePdf,
} from './features/sanitaire';
import { TourneeVocale } from './features/tournee-vocale';
import { ObservationCadre } from './features/cadre-par-cadre';

export function App() {
  const [ecran, setEcran] = useState('vue_ensemble');
  const [colonieSelectionnee, setColonieSelectionnee] = useState(null);
  const [visiteSelectionnee, setVisiteSelectionnee] = useState(null);

  function ouvrirSaisie(colonieId) {
    setColonieSelectionnee(colonieId);
    setEcran('saisie_visite');
  }

  function ouvrirHistorique(colonieId) {
    setColonieSelectionnee(colonieId);
    setEcran('historique');
  }

  function ouvrirSanitaire(colonieId) {
    setColonieSelectionnee(colonieId);
    setEcran('sanitaire');
  }

  function ouvrirSaisieTraitement(colonieId) {
    setColonieSelectionnee(colonieId);
    setEcran('saisie_traitement');
  }

  function ouvrirSaisieComptageVarroa(colonieId) {
    setColonieSelectionnee(colonieId);
    setEcran('saisie_comptage_varroa');
  }

  function ouvrirSaisieNourrissement(colonieId) {
    setColonieSelectionnee(colonieId);
    setEcran('saisie_nourrissement');
  }

  function ouvrirExportSanitairePdf() {
    setEcran('export_sanitaire_pdf');
  }

  function ouvrirTourneeVocale() {
    setEcran('tournee_vocale');
  }

  function ouvrirObservationCadre(visiteId, colonieId) {
    setVisiteSelectionnee(visiteId);
    setColonieSelectionnee(colonieId);
    setEcran('observation_cadre');
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
      <SaisieVisite
        colonieInitialeId={colonieSelectionnee}
        onRetour={retourVueEnsemble}
        onOuvrirHistorique={ouvrirHistorique}
        onOuvrirSanitaire={ouvrirSanitaire}
        onOuvrirObservationCadre={ouvrirObservationCadre}
      />
    );
  }

  if (ecran === 'historique') {
    return <Historique colonieId={colonieSelectionnee} onRetour={retourVueEnsemble} />;
  }

  if (ecran === 'sanitaire') {
    return (
      <HistoriqueSanitaire
        colonieId={colonieSelectionnee}
        onRetour={retourVueEnsemble}
        onOuvrirSaisieTraitement={ouvrirSaisieTraitement}
        onOuvrirSaisieComptageVarroa={ouvrirSaisieComptageVarroa}
        onOuvrirSaisieNourrissement={ouvrirSaisieNourrissement}
      />
    );
  }

  if (ecran === 'saisie_traitement') {
    return (
      <SaisieTraitement
        colonieId={colonieSelectionnee}
        onRetour={() => ouvrirSanitaire(colonieSelectionnee)}
        onEnregistre={ouvrirSanitaire}
      />
    );
  }

  if (ecran === 'saisie_comptage_varroa') {
    return (
      <SaisieComptageVarroa
        colonieId={colonieSelectionnee}
        onRetour={() => ouvrirSanitaire(colonieSelectionnee)}
        onEnregistre={ouvrirSanitaire}
      />
    );
  }

  if (ecran === 'saisie_nourrissement') {
    return (
      <SaisieNourrissement
        colonieId={colonieSelectionnee}
        onRetour={() => ouvrirSanitaire(colonieSelectionnee)}
        onEnregistre={ouvrirSanitaire}
      />
    );
  }

  if (ecran === 'export_sanitaire_pdf') {
    return <ExportSanitairePdf onRetour={retourVueEnsemble} />;
  }

  if (ecran === 'tournee_vocale') {
    return <TourneeVocale onRetour={retourVueEnsemble} />;
  }

  if (ecran === 'observation_cadre') {
    return (
      <ObservationCadre
        visiteId={visiteSelectionnee}
        colonieId={colonieSelectionnee}
        onTerminer={() => ouvrirSaisie(colonieSelectionnee)}
      />
    );
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
      onOuvrirImport={ouvrirImport}
      onOuvrirRestauration={ouvrirRestauration}
      onOuvrirExportSanitairePdf={ouvrirExportSanitairePdf}
      onOuvrirTourneeVocale={ouvrirTourneeVocale}
    />
  );
}
