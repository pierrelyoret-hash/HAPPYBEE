import { useEffect, useState } from 'react';
import { PastilleEtat } from '../../components/PastilleEtat.jsx';
import { LigneColonie } from './LigneColonie.jsx';
import { db } from '../../db/db.js';
import {
  obtenirPremierRucher,
  mettreAJourOrdreTournee,
} from '../../db/repositories/ruchers.js';
import { obtenirDerniereVisite } from '../../db/repositories/visites.js';
import {
  listerTachesOuvertesRucher,
  marquerTacheFaite,
  creerTache,
} from '../../db/repositories/taches.js';
import { exporterDonnees, compterEnregistrements } from '../../db/repositories/sauvegarde.js';
import { listerEvenementsExportConsolide } from '../../db/repositories/historiqueConsolide.js';
import { declencherTelechargementJson, declencherTelechargementCsv } from '../../lib/telechargement.js';
import { genererCsvConsolide } from '../../lib/exportCsvConsolide.js';
import { calculerEtat, joursDepuis, SEUIL_JOURS_A_VISITER } from '../../lib/etats.js';
import { surSync } from '../../lib/sync.js';

function useHorsLigne() {
  const [horsLigne, setHorsLigne] = useState(!navigator.onLine);
  useEffect(() => {
    const majEtat = () => setHorsLigne(!navigator.onLine);
    window.addEventListener('online', majEtat);
    window.addEventListener('offline', majEtat);
    return () => {
      window.removeEventListener('online', majEtat);
      window.removeEventListener('offline', majEtat);
    };
  }, []);
  return horsLigne;
}

function dateLisible(iso) {
  return new Date(iso).toLocaleDateString('fr-FR');
}


export function VueEnsemble({
  onOuvrirVisite,
  onOuvrirImport,
  onOuvrirRestauration,
  onOuvrirExportSanitairePdf,
  onOuvrirTourneeVocale,
  onOuvrirTaches,
}) {
  const [rucher, setRucher] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [messageSauvegarde, setMessageSauvegarde] = useState(null);
  const [modeEdition, setModeEdition] = useState(false);
  const horsLigne = useHorsLigne();

  // Sauvegarde manuelle en un geste, directement depuis l'écran d'accueil
  // (brief F10.4) — aucun écran intermédiaire pour l'export.
  async function sauvegarder() {
    try {
      const donnees = await exporterDonnees();
      declencherTelechargementJson(
        `happybee-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`,
        donnees
      );
      setMessageSauvegarde(`Fichier téléchargé (${compterEnregistrements(donnees)} enregistrement(s)).`);
    } catch (err) {
      console.error('[sauvegarde] échec export', err);
      setMessageSauvegarde("Échec de l'export.");
    }
  }

  // Export consolidé (retour d'usage réel du 14/08/2026) : visite,
  // sanitaire, récolte et mouvement de toute l'exploitation, une ligne par
  // événement — distinct de la sauvegarde JSON ci-dessus (celle-ci reste la
  // seule à garantir une restauration fidèle ; le CSV est pour la lecture
  // et le croisement, pas une source de vérité pour la restauration).
  async function exporterHistoriqueConsolide() {
    try {
      const evenements = await listerEvenementsExportConsolide();
      const csv = genererCsvConsolide(evenements);
      declencherTelechargementCsv(
        `happybee-historique-${new Date().toISOString().slice(0, 10)}.csv`,
        csv
      );
      setMessageSauvegarde(`Historique exporté (${evenements.length} événement(s)).`);
    } catch (err) {
      console.error('[export consolidé] échec', err);
      setMessageSauvegarde("Échec de l'export de l'historique.");
    }
  }

  async function charger() {
    const r = await obtenirPremierRucher();
    if (!r) {
      setRucher(null);
      setLignes([]);
      setChargement(false);
      return;
    }
    setRucher(r);

    const ordre = r.ordre_tournee ?? [];
    const ruches = await db.ruche.bulkGet(ordre);
    const colonies = await db.colonie
      .where('ruche_id')
      .anyOf(ordre)
      .and((c) => c.statut === 'active' && !c.deleted_at)
      .toArray();
    const colonieParRuche = new Map(colonies.map((c) => [c.ruche_id, c]));
    const tachesOuvertes = await listerTachesOuvertesRucher(r.id);

    const donnees = await Promise.all(
      ordre.map(async (rucheId, index) => {
        const ruche = ruches[index];
        const colonie = colonieParRuche.get(rucheId);
        if (!ruche || !colonie) return null;

        const reine = await db.reine
          .where('colonie_id')
          .equals(colonie.id)
          .and((r2) => !r2.deleted_at)
          .first();

        const derniereVisite = await obtenirDerniereVisite(colonie.id);

        const tachesColonie = tachesOuvertes.filter(
          (t) => t.colonie_id === colonie.id || (t.colonie_id == null && t.rucher_id === r.id)
        );

        const joursDepuisVisite = derniereVisite ? joursDepuis(derniereVisite.date) : null;

        // §6.3 : "aucune visite depuis 21 jours en saison (avril-septembre)"
        // → contrôle de routine. Contrairement aux autres rappels (créés au
        // moment d'une saisie), celui-ci naît de l'écoulement du temps — il
        // se vérifie ici, au chargement de l'écran d'accueil, pas dans un
        // écran de saisie. Une seule tâche ouverte à la fois par colonie :
        // on ne recrée pas si une précédente n'a pas encore été traitée.
        const MOIS_SAISON = [4, 5, 6, 7, 8, 9];
        const enSaison = MOIS_SAISON.includes(new Date().getMonth() + 1);
        if (
          enSaison &&
          joursDepuisVisite != null &&
          joursDepuisVisite > SEUIL_JOURS_A_VISITER &&
          !tachesColonie.some((t) => t.regle_origine === 'pas_de_visite_21j')
        ) {
          const maintenant = new Date().toISOString();
          const nouvelleTache = {
            id: crypto.randomUUID(),
            colonie_id: colonie.id,
            rucher_id: r.id,
            libelle: 'Contrôle de routine',
            date_echeance: maintenant,
            priorite: 'moyenne',
            origine: 'generee',
            regle_origine: 'pas_de_visite_21j',
            statut: 'a_faire',
            visite_declencheuse_id: null,
            created_at: maintenant,
            updated_at: maintenant,
            deleted_at: null,
          };
          await creerTache(nouvelleTache);
          tachesColonie.push(nouvelleTache);
        }

        const etat = calculerEtat({ tachesOuvertes: tachesColonie, joursDepuisVisite });

        return {
          ruche,
          colonie,
          reine,
          etat,
          joursDepuisVisite,
          derniereVisite,
          couvain: derniereVisite?.nb_cadres_couvain_opercule ?? null,
          provisions: derniereVisite?.nb_cadres_provisions ?? null,
          tachesUrgentes: tachesColonie.filter(
            (t) => t.date_echeance && new Date(t.date_echeance).getTime() <= Date.now()
          ),
        };
      })
    );

    setLignes(donnees.filter(Boolean));
    setChargement(false);
  }

  useEffect(() => {
    charger();
    // Se recharge tout seul quand une synchronisation en arrière-plan a pu
    // apporter de nouvelles données depuis un autre appareil.
    return surSync(() => charger());
  }, []);

  async function terminerTache(tacheId) {
    await marquerTacheFaite(tacheId);
    await charger();
  }

  async function deplacer(index, direction) {
    const nouvelOrdre = [...rucher.ordre_tournee];
    const cible = index + direction;
    if (cible < 0 || cible >= nouvelOrdre.length) return;
    [nouvelOrdre[index], nouvelOrdre[cible]] = [nouvelOrdre[cible], nouvelOrdre[index]];
    await mettreAJourOrdreTournee(rucher.id, nouvelOrdre);
    await charger();
  }

  if (chargement) return null;

  if (!rucher) {
    return <p className="p-4 text-13 text-ink-secondary">Aucun rucher trouvé.</p>;
  }

  const urgences = lignes.filter((l) => l.etat === 'urgent');

  return (
    <div className="min-h-screen bg-ground text-ink p-4 flex flex-col gap-4 max-w-md mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-20 font-bold">{rucher.nom}</h1>
        {horsLigne && (
          <span className="text-11 text-ink-muted border border-rule-strong rounded px-2 py-1">
            Hors ligne
          </span>
        )}
      </header>

      {urgences.length > 0 && (
        <section className="flex flex-col gap-2">
          {urgences.map((ligne) => (
            <div
              key={ligne.colonie.id}
              className="flex items-start gap-2 border border-rule-strong bg-urgent-bg rounded p-3"
            >
              <button
                type="button"
                onClick={() => onOuvrirVisite(ligne.colonie.id)}
                className="text-left flex-1 min-w-0"
              >
                <p className="text-13 font-bold text-urgent-ink">
                  ! Ruche {ligne.ruche.numero} — {ligne.tachesUrgentes[0]?.libelle ?? 'échéance dépassée'}
                </p>
                <p className="text-11 text-urgent-ink">
                  Échéance : {dateLisible(ligne.tachesUrgentes[0]?.date_echeance)}
                </p>
              </button>
              {ligne.tachesUrgentes[0] && (
                <button
                  type="button"
                  onClick={() => terminerTache(ligne.tachesUrgentes[0].id)}
                  className="text-11 text-urgent-ink underline shrink-0 mt-0.5"
                >
                  ✓ Fait
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      <button
        type="button"
        onClick={() => onOuvrirVisite(null)}
        className="h-[46px] w-full rounded bg-ink text-surface text-15 font-bold"
      >
        Saisir une visite
      </button>

      <button
        type="button"
        onClick={onOuvrirTourneeVocale}
        className="h-10 w-full rounded bg-surface border border-rule-strong text-ink text-15 font-bold"
      >
        Tournée vocale
        <span className="block text-11 font-normal text-ink-secondary">
          dicter la tournée, colonie par colonie
        </span>
      </button>

      <section>
        <div className="flex items-center justify-between mb-2">
          <p className="text-13 text-ink-secondary">Ordre de tournée</p>
          {modeEdition && (
            <button
              type="button"
              onClick={() => setModeEdition(false)}
              className="text-12 text-ink-secondary underline"
            >
              Terminé
            </button>
          )}
        </div>
        <ul className="bg-surface rounded border border-rule divide-y divide-rule">
          {lignes.map((ligne, index) => (
            <LigneColonie
              key={ligne.colonie.id}
              ligne={ligne}
              modeEdition={modeEdition}
              premiere={index === 0}
              derniere={index === lignes.length - 1}
              onOuvrirVisite={onOuvrirVisite}
              onEntrerModeEdition={() => setModeEdition(true)}
              onDeplacer={(direction) => deplacer(index, direction)}
            />
          ))}
        </ul>
      </section>

      <footer className="flex flex-col gap-3 mt-2">
        <div>
          <p className="text-12 text-ink-secondary mb-1">Légende</p>
          <div className="flex flex-wrap gap-2">
            <PastilleEtat etat="urgent" />
            <PastilleEtat etat="action" />
            <PastilleEtat etat="a_visiter" />
            <PastilleEtat etat="normale" />
          </div>
        </div>

        <div className="flex flex-col gap-1 pt-2 border-t border-rule">
          <button type="button" onClick={onOuvrirImport} className="text-12 text-ink-secondary self-start">
            Importer l'historique CSV
          </button>
          <button type="button" onClick={sauvegarder} className="text-12 text-ink-secondary self-start">
            Sauvegarder (export JSON)
          </button>
          <button type="button" onClick={onOuvrirRestauration} className="text-12 text-ink-secondary self-start">
            Restaurer une sauvegarde
          </button>
          <button
            type="button"
            onClick={onOuvrirExportSanitairePdf}
            className="text-12 text-ink-secondary self-start"
          >
            Exporter le PDF sanitaire
          </button>
          <button
            type="button"
            onClick={exporterHistoriqueConsolide}
            className="text-12 text-ink-secondary self-start"
          >
            Exporter l'historique consolidé (CSV)
          </button>
          {onOuvrirTaches && (
            <button type="button" onClick={onOuvrirTaches} className="text-12 text-ink-secondary self-start">
              Voir toutes les tâches
            </button>
          )}
          {messageSauvegarde && <p className="text-11 text-ink-muted">{messageSauvegarde}</p>}
        </div>
      </footer>
    </div>
  );
}
