import { useEffect, useState } from 'react';
import { initialiserCatalogue } from './db/repositories/regles.js';
import { initialiserCategoriesParDefaut } from './db/repositories/economie.js';
import { BarreOnglets } from './components/BarreOnglets.jsx';
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
import { FilTournee } from './features/tournee';
import { SaisieRecolte, HistoriqueRecolte, RendementRecolte } from './features/recolte';
import { SaisieMouvement, HistoriqueMouvement } from './features/mouvement';
import { TachesAFaire } from './features/taches';
import { Meteo } from './features/meteo';
import {
  RecommandationsEnAttente,
  DetailRecommandation,
  HistoriqueRecommandations,
  ParametrageRegles,
} from './features/recommandations';
import {
  AccueilEconomique,
  SaisieEcriture,
  JournalEcritures,
  Tiers,
  Immobilisations,
  FicheImmobilisation,
  TableauDeBord,
  ComparaisonPluriannuelle,
} from './features/economie';

export function App() {
  const [ecran, setEcran] = useState('accueil');
  const [rucherSelectionne, setRucherSelectionne] = useState(null);
  const [colonieSelectionnee, setColonieSelectionnee] = useState(null);
  const [visiteSelectionnee, setVisiteSelectionnee] = useState(null);
  const [recommandationSelectionnee, setRecommandationSelectionnee] = useState(null);
  const [immobilisationSelectionnee, setImmobilisationSelectionnee] = useState(null);
  // Écran vers lequel revenir après une saisie de visite — la plupart des
  // parcours viennent de la vue d'ensemble, mais le fil de tournée doit
  // pouvoir y ramener directement plutôt que de renvoyer systématiquement
  // vers vue_ensemble (retour d'usage réel, 15/08/2026, relevé en relisant
  // FilTournee.jsx).
  const [ecranRetourSaisie, setEcranRetourSaisie] = useState('vue_ensemble');

  // Écriture locale, indépendante du jumelage/de la synchronisation (données
  // hors-ligne d'abord) : doit s'exécuter même si l'exploitant a "reporté"
  // le jumelage. initialiserCatalogue (L3bis) n'était jusqu'ici jamais
  // appelée nulle part dans l'application — bug constaté en câblant celle
  // de L4 juste en dessous : sur un appareil neuf, `regle` restait vide et
  // aucune des règles du moteur L3bis ne s'évaluait jamais. Corrigé ici.
  useEffect(() => {
    initialiserCatalogue();
    initialiserCategoriesParDefaut();
  }, []);

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

  function ouvrirSaisieDepuis(colonieId, origine) {
    setEcranRetourSaisie(origine);
    ouvrirSaisie(colonieId);
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

  function ouvrirMeteo() {
    setEcran('meteo');
  }

  function ouvrirRecommandations() {
    setEcran('recommandations');
  }

  function ouvrirDetailRecommandation(recommandationId) {
    setRecommandationSelectionnee(recommandationId);
    setEcran('detail_recommandation');
  }

  function ouvrirHistoriqueRecommandations() {
    setEcran('historique_recommandations');
  }

  function ouvrirParametrageRegles() {
    setEcran('parametrage_regles');
  }

  function ouvrirEconomique() {
    setEcran('economique');
  }

  function ouvrirSaisieEcriture() {
    setEcran('saisie_ecriture');
  }

  function ouvrirJournalEcritures() {
    setEcran('journal_ecritures');
  }

  function ouvrirTiersEconomie() {
    setEcran('tiers_economie');
  }

  function ouvrirImmobilisations() {
    setEcran('immobilisations');
  }

  function ouvrirFicheImmobilisation(immobilisationId) {
    setImmobilisationSelectionnee(immobilisationId);
    setEcran('fiche_immobilisation');
  }

  function ouvrirTableauDeBordEconomique() {
    setEcran('tableau_de_bord_economique');
  }

  function ouvrirComparaisonPluriannuelle() {
    setEcran('comparaison_pluriannuelle');
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

  function ouvrirFilTournee(rucherId) {
    setRucherSelectionne(rucherId);
    setEcran('fil_tournee');
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

  function retourDepuisSaisie() {
    if (ecranRetourSaisie === 'fil_tournee') {
      setEcran('fil_tournee');
      return;
    }
    retourVueEnsemble();
  }

  // Barre d'onglets (refonte visuelle §6) : uniquement sur les écrans de
  // premier niveau. "vue_ensemble" reste sous l'onglet "Rucher" — c'est un
  // écran poussé depuis Accueil, pas une destination d'onglet séparée, donc
  // il garde en plus son propre retour "← Ruchers" dans EnTeteEcran.
  const ONGLET_PAR_ECRAN = { accueil: 'rucher', vue_ensemble: 'rucher', taches: 'taches', meteo: 'meteo' };

  function naviguerOnglet(cle) {
    if (cle === 'rucher') ouvrirAccueil();
    else if (cle === 'taches') ouvrirTaches();
    else if (cle === 'meteo') ouvrirMeteo();
  }

  function avecBarreOnglets(contenu) {
    return (
      <>
        {contenu}
        <BarreOnglets actif={ONGLET_PAR_ECRAN[ecran]} onNaviguer={naviguerOnglet} />
      </>
    );
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
        onRetour={retourDepuisSaisie}
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
    return avecBarreOnglets(<TachesAFaire onRetour={ouvrirAccueil} />);
  }

  if (ecran === 'meteo') {
    return avecBarreOnglets(
      <Meteo onRetour={ouvrirAccueil} onOuvrirSaisieRucher={ouvrirSaisieRucher} />
    );
  }

  if (ecran === 'recommandations') {
    return (
      <RecommandationsEnAttente
        onRetour={ouvrirAccueil}
        onOuvrirDetail={ouvrirDetailRecommandation}
        onOuvrirHistorique={ouvrirHistoriqueRecommandations}
        onOuvrirParametrage={ouvrirParametrageRegles}
      />
    );
  }

  if (ecran === 'detail_recommandation') {
    return (
      <DetailRecommandation
        recommandationId={recommandationSelectionnee}
        onRetour={ouvrirRecommandations}
        onTraitee={ouvrirRecommandations}
      />
    );
  }

  if (ecran === 'historique_recommandations') {
    return <HistoriqueRecommandations onRetour={ouvrirRecommandations} />;
  }

  if (ecran === 'parametrage_regles') {
    return <ParametrageRegles onRetour={ouvrirRecommandations} />;
  }

  if (ecran === 'economique') {
    return (
      <AccueilEconomique
        onRetour={ouvrirAccueil}
        onOuvrirSaisie={ouvrirSaisieEcriture}
        onOuvrirJournal={ouvrirJournalEcritures}
        onOuvrirTableauDeBord={ouvrirTableauDeBordEconomique}
        onOuvrirImmobilisations={ouvrirImmobilisations}
        onOuvrirTiers={ouvrirTiersEconomie}
        onOuvrirComparaison={ouvrirComparaisonPluriannuelle}
      />
    );
  }

  if (ecran === 'comparaison_pluriannuelle') {
    return <ComparaisonPluriannuelle onRetour={ouvrirEconomique} />;
  }

  if (ecran === 'saisie_ecriture') {
    return <SaisieEcriture onRetour={ouvrirEconomique} />;
  }

  if (ecran === 'journal_ecritures') {
    return <JournalEcritures onOuvrirSaisie={ouvrirSaisieEcriture} onRetour={ouvrirEconomique} />;
  }

  if (ecran === 'tiers_economie') {
    return <Tiers onRetour={ouvrirEconomique} />;
  }

  if (ecran === 'immobilisations') {
    return <Immobilisations onOuvrirFiche={ouvrirFicheImmobilisation} onRetour={ouvrirEconomique} />;
  }

  if (ecran === 'fiche_immobilisation') {
    return <FicheImmobilisation immobilisationId={immobilisationSelectionnee} onRetour={ouvrirImmobilisations} />;
  }

  if (ecran === 'tableau_de_bord_economique') {
    return <TableauDeBord onRetour={ouvrirEconomique} />;
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

  if (ecran === 'fil_tournee') {
    return (
      <FilTournee
        rucherId={rucherSelectionne}
        onRetour={retourVueEnsemble}
        onOuvrirVisite={(colonieId) => ouvrirSaisieDepuis(colonieId, 'fil_tournee')}
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
    return avecBarreOnglets(
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

  return avecBarreOnglets(
    <Accueil
      onOuvrirRucher={ouvrirRucher}
      onOuvrirSaisieRucher={ouvrirSaisieRucher}
      onOuvrirRestauration={ouvrirRestauration}
      onOuvrirExportSanitairePdf={ouvrirExportSanitairePdf}
      onOuvrirTaches={ouvrirTaches}
      onOuvrirMeteo={ouvrirMeteo}
      onOuvrirFilTournee={ouvrirFilTournee}
      onOuvrirRecommandations={ouvrirRecommandations}
      onOuvrirEconomique={ouvrirEconomique}
    />
  );
}
