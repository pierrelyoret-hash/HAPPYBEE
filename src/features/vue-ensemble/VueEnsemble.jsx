import { useEffect, useState } from 'react';
import { EnTeteEcran } from '../../components/EnTeteEcran.jsx';
import { PastilleEtat } from '../../components/PastilleEtat.jsx';
import { LigneColonie } from './LigneColonie.jsx';
import { db } from '../../db/db.js';
import { obtenirRucher, mettreAJourOrdreTournee } from '../../db/repositories/ruchers.js';
import { archiverRuche } from '../../db/repositories/ruches.js';
import { obtenirDerniereVisite } from '../../db/repositories/visites.js';
import { listerTachesOuvertesRucher, creerTache } from '../../db/repositories/taches.js';
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

function estAujourdhui(dateIso) {
  if (!dateIso) return false;
  const d = new Date(dateIso);
  const maintenant = new Date();
  return (
    d.getFullYear() === maintenant.getFullYear() &&
    d.getMonth() === maintenant.getMonth() &&
    d.getDate() === maintenant.getDate()
  );
}

export function VueEnsemble({
  rucherId,
  onOuvrirVisite,
  onOuvrirTourneeVocale,
  onRetourAccueil,
  onOuvrirSaisieRucher,
  onOuvrirSaisieRuche,
  onOuvrirImport,
}) {
  const [rucher, setRucher] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [modeEdition, setModeEdition] = useState(false);
  const horsLigne = useHorsLigne();

  async function charger() {
    const r = await obtenirRucher(rucherId);
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
  }, [rucherId]);

  async function deplacer(index, direction) {
    const nouvelOrdre = [...rucher.ordre_tournee];
    const cible = index + direction;
    if (cible < 0 || cible >= nouvelOrdre.length) return;
    [nouvelOrdre[index], nouvelOrdre[cible]] = [nouvelOrdre[cible], nouvelOrdre[index]];
    await mettreAJourOrdreTournee(rucher.id, nouvelOrdre);
    await charger();
  }

  async function archiver(rucheId) {
    await archiverRuche(rucheId, rucher.id);
    await charger();
  }

  if (chargement) return null;

  if (!rucher) {
    return <p className="p-4 text-13 text-ink-secondary">Aucun rucher trouvé.</p>;
  }

  const visiteesAujourdhui = lignes.filter((l) => estAujourdhui(l.derniereVisite?.date)).length;

  return (
    <div className="min-h-screen bg-ground text-ink flex flex-col max-w-md mx-auto pb-14">
      <EnTeteEcran
        titre={rucher.nom}
        retourLibelle="← Ruchers"
        onRetour={onRetourAccueil}
        droite={
          <div className="flex items-center gap-2">
            {horsLigne && (
              <span className="font-mono text-[10px] font-bold text-sur-miel border border-sur-miel rounded px-1.5 py-0.5">
                HORS LIGNE
              </span>
            )}
            {onOuvrirSaisieRucher && (
              <button
                type="button"
                onClick={() => onOuvrirSaisieRucher(rucher.id)}
                className="text-13 text-sur-miel underline"
              >
                Modifier
              </button>
            )}
          </div>
        }
        progression={lignes.length > 0 ? { fait: visiteesAujourdhui, total: lignes.length } : undefined}
      />

      <div className="flex-1 flex flex-col gap-4 pt-4">
        <section>
          <div className="flex items-center justify-between mb-2 px-4">
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
          <ul className="bg-surface border-t border-b border-rule divide-y divide-rule">
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
                onArchiver={() => archiver(ligne.ruche.id)}
              />
            ))}
          </ul>
          {/* Toujours visible, pas seulement en mode réordonnancement : sans
              ça, un rucher neuf sans aucune ruche n'a aucun moyen d'en
              ajouter une première (rien à appuyer longuement pour entrer en
              mode édition). Bug constaté le 14/08/2026. */}
          {onOuvrirSaisieRuche && (
            <div className="px-4">
              <button
                type="button"
                onClick={() => onOuvrirSaisieRuche(rucher.id)}
                className="mt-2 h-11 w-full rounded bg-miel text-ink text-13 font-bold"
              >
                + Ruche
              </button>
            </div>
          )}
        </section>

        <footer className="flex flex-col gap-3 px-4">
          <div>
            <p className="text-12 text-ink-secondary mb-1">Légende</p>
            <div className="flex flex-wrap gap-2">
              <PastilleEtat etat="urgent" />
              <PastilleEtat etat="action" />
              <PastilleEtat etat="a_visiter" />
              <PastilleEtat etat="normale" />
            </div>
          </div>

          {onOuvrirImport && (
            <div className="pt-2 border-t border-rule">
              <button
                type="button"
                onClick={onOuvrirImport}
                className="text-12 text-ink-secondary self-start"
              >
                Importer l'historique CSV
              </button>
            </div>
          )}
        </footer>
      </div>

      <div className="px-4 py-3 border-t border-rule flex flex-col gap-2">
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
      </div>
    </div>
  );
}
