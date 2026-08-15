import { useState } from 'react';
import { Accueil, SaisieRucher, SaisieRuche } from './features/accueil';
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
import { RevueTournee } from './features/revue-tournee';
import { SaisieRecolte, HistoriqueRecolte, RendementRecolte } from './features/recolte';
import { SaisieMouvement, HistoriqueMouvement } from './features/mouvement';
import { TachesAFaire } from './features/taches';

export function App() {
  const [ecran, setEcran] = useState('accueil');
  const [rucherSelectionne, setRucherSelectionne] = useState(null);
  const [colonieSelectionnee, setColonieSelectionnee] = useState(null);
  const [visiteSelectionnee, setVisiteSelectionnee] = useState(null);

  function ouvrirAccueil() {
    setEcran('accueil');
  }

  function ouvrirRucher(rucherId) {
    setRucherSelectionne(rucherId);
    setEcran('vue_ensemble');
  }

  function ouvrirSaisieRucher(rucherId) {
    setRucherSelectionne(rucherId);
    setEcran('saisie_rucher');
  }

  function ouvrirSaisieRuche(rucherId) {
    setRucherSelectionne(rucherId);
    setEcran('saisie_ruche');
  }

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

  function ouvrirRecolte(colonieId) {
    setColonieSelectionnee(colonieId);
    setEcran('recolte');
  }

  function ouvrirSaisieRecolte(colonieId) {
    setColonieSelectionnee(colonieId);
    setEcran('saisie_recolte');
  }

  function ouvrirRendement() {
    setEcran('rendement');
  }

  function ouvrirMouvement(colonieId) {
    setColonieSelectionnee(colonieId);
    setEcran('mouvement');
  }

  function ouvrirSaisieMouvement(colonieId) {
    setColonieSelectionnee(colonieId);
    setEcran('saisie_mouvement');
  }

  function ouvrirTaches() {
    setEcran('taches');
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

  function ouvrirRevueTournee() {
    setEcran('revue_tournee');
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

  if (ecran === 'saisie_rucher') {
    return (
      <SaisieRucher
        rucherId={rucherSelectionne}
        onRetour={ouvrirAccueil}
        onEnregistre={ouvrirRucher}
      />
    );
  }

  if (ecran === 'saisie_ruche') {
    return (
      <SaisieRuche
        rucherId={rucherSelectionne}
        onRetour={() => ouvrirRucher(rucherSelectionne)}
        onEnregistre={ouvrirRucher}
      />
    );
  }

  if (ecran === 'saisie_visite') {
    return (
      <SaisieVisite
        rucherId={rucherSelectionne}
        colonieInitialeId={colonieSelectionnee}
        onRetour={retourVueEnsemble}
        onOuvrirHistorique={ouvrirHistorique}
        onOuvrirSanitaire={ouvrirSanitaire}
        onOuvrirObservationCadre={ouvrirObservationCadre}
        onOuvrirRecolte={ouvrirRecolte}
        onOuvrirMouvement={ouvrirMouvement}
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

  if (ecran === 'recolte') {
    return (
      <HistoriqueRecolte
        colonieId={colonieSelectionnee}
        onRetour={() => ouvrirSaisie(colonieSelectionnee)}
        onOuvrirSaisieRecolte={ouvrirSaisieRecolte}
        onOuvrirRendement={ouvrirRendement}
      />
    );
  }

  if (ecran === 'saisie_recolte') {
    return (
      <SaisieRecolte
        colonieId={colonieSelectionnee}
        onRetour={() => ouvrirRecolte(colonieSelectionnee)}
        onEnregistre={ouvrirRecolte}
      />
    );
  }

  if (ecran === 'rendement') {
    return <RendementRecolte onRetour={() => ouvrirRecolte(colonieSelectionnee)} />;
  }

  if (ecran === 'mouvement') {
    return (
      <HistoriqueMouvement
        colonieId={colonieSelectionnee}
        onRetour={() => ouvrirSaisie(colonieSelectionnee)}
        onOuvrirSaisieMouvement={ouvrirSaisieMouvement}
      />
    );
  }

  if (ecran === 'saisie_mouvement') {
    return (
      <SaisieMouvement
        colonieId={colonieSelectionnee}
        onRetour={() => ouvrirMouvement(colonieSelectionnee)}
        onEnregistre={ouvrirMouvement}
        onRucheDeplacee={ouvrirAccueil}
      />
    );
  }

  if (ecran === 'taches') {
    return <TachesAFaire onRetour={ouvrirAccueil} />;
  }

  if (ecran === 'export_sanitaire_pdf') {
    return <ExportSanitairePdf onRetour={ouvrirAccueil} />;
  }

  if (ecran === 'tournee_vocale') {
    return (
      <TourneeVocale
        rucherId={rucherSelectionne}
        onRetour={retourVueEnsemble}
        onOuvrirRevueTournee={ouvrirRevueTournee}
      />
    );
  }

  if (ecran === 'revue_tournee') {
    return (
      <RevueTournee
        rucherId={rucherSelectionne}
        onRetour={retourVueEnsemble}
        onOuvrirSaisieVisite={ouvrirSaisie}
      />
    );
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
    return <ImportCsv rucherId={rucherSelectionne} onRetour={retourVueEnsemble} />;
  }

  if (ecran === 'restauration') {
    return <Restauration onRetour={ouvrirAccueil} />;
  }

  if (ecran === 'vue_ensemble') {
    return (
      <VueEnsemble
        rucherId={rucherSelectionne}
        onOuvrirVisite={ouvrirSaisie}
        onOuvrirTourneeVocale={ouvrirTourneeVocale}
        onRetourAccueil={ouvrirAccueil}
        onOuvrirSaisieRucher={ouvrirSaisieRucher}
        onOuvrirSaisieRuche={ouvrirSaisieRuche}
        onOuvrirImport={ouvrirImport}
      />
    );
  }

  return (
    <Accueil
      onOuvrirRucher={ouvrirRucher}
      onOuvrirSaisieRucher={ouvrirSaisieRucher}
      onOuvrirRestauration={ouvrirRestauration}
      onOuvrirExportSanitairePdf={ouvrirExportSanitairePdf}
      onOuvrirTaches={ouvrirTaches}
    />
  );
}
