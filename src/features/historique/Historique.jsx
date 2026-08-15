import { useEffect, useState } from 'react';
import { db } from '../../db/db.js';
import { listerHistoriqueConsolideColonie } from '../../db/repositories/historiqueConsolide.js';
import { surSync } from '../../lib/sync.js';
import { BoutonRetour } from '../../components/BoutonRetour.jsx';
import { PhotosVisite } from '../../components/PhotosVisite.jsx';
import { SIGNES_SANITAIRES_LIBELLES } from '../../lib/taxonomieSanitaire.js';
import {
  VOIE_LIBELLES,
  METHODE_LIBELLES,
  NIVEAU_ALERTE_LIBELLES,
  TYPE_NOURRISSEMENT_LIBELLES,
  ORIGINE_LIBELLES,
} from '../../lib/libellesSanitaire.js';
import { PRODUIT_LIBELLES, MODE_SAISIE_LIBELLES } from '../../lib/libellesRecolte.js';
import { TYPE_MOUVEMENT_LIBELLES } from '../../lib/libellesMouvement.js';
import {
  TYPE_CADRE_LIBELLES,
  CHAMPS_OCCUPATION,
  PONTE_ECHELLE_LIBELLES as PONTE_CADRE_LIBELLES,
  CELLULES_ROYALES_TYPE_LIBELLES,
  CELLULES_ROYALES_POS_LIBELLES,
} from '../../lib/libellesCadre.js';

const ANOMALIE_LIBELLES = {
  bourdonneuse: 'Bourdonneuse',
  orpheline: 'Orpheline',
  pillage: 'Pillage',
  fausse_teigne: 'Fausse teigne',
  mortalite_anormale: 'Mortalité anormale',
  diarrhee: 'Diarrhée',
  abeilles_tremblantes: 'Abeilles noires tremblantes',
  ponte_males: 'Ponte de mâles',
  autre: 'Autre',
};

// Correction écrans L1 §7/§9.2 — ponte_qualite est retiré du schéma,
// score_ponte (0-5) est l'unique champ. Mêmes libellés qu'à la saisie.
const PONTE_ECHELLE_LIBELLES = {
  0: 'aucune ponte',
  1: 'très dispersée',
  2: 'lacunaire',
  3: 'correcte',
  4: 'compacte',
  5: 'très compacte',
};

function dateLisible(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('fr-FR');
}

// L'heure exacte n'est fiable que dans le champ texte "heure" (brief §6 :
// conservé tel quel, ex. "16h00") — la partie horaire de "date" vaut minuit
// par défaut dès que l'heure d'origine était absente ou non structurée.
function dateHeureLisible(visite) {
  const date = new Date(visite.date).toLocaleDateString('fr-FR');
  return visite.heure ? `${date} à ${visite.heure}` : date;
}

// "Un chiffre absolu n'informe pas ; un écart, si." (addendum §7). Affiche la
// variation par rapport à la visite précédente quand les deux valeurs sont
// connues et différentes — jamais de calcul si l'une des deux est "non observé".
function champAvecEcart(valeur, valeurPrecedente) {
  if (valeur == null) return 'non observé';
  if (valeurPrecedente == null || valeurPrecedente === valeur) return String(valeur);
  const ecart = valeur - valeurPrecedente;
  return `${valeur} (${ecart > 0 ? '+' : '−'}${Math.abs(ecart)})`;
}

// Détail cadre par cadre d'une visite (retour d'usage réel du 14/08/2026 :
// jusqu'ici enregistré mais nulle part consultable une fois la visite
// terminée). Repliable, une face par ligne.
function DetailCadre({ observations }) {
  const triees = [...observations].sort((a, b) => a.position - b.position || a.face.localeCompare(b.face));
  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-rule pt-2">
      {triees.map((o) => (
        <div key={o.id} className="text-13">
          <p className="font-bold">
            Cadre {o.position} — Face {o.face}
            {o.type_cadre && ` · ${TYPE_CADRE_LIBELLES[o.type_cadre] ?? o.type_cadre}`}
          </p>
          <p className="text-ink-secondary">
            {CHAMPS_OCCUPATION.filter(([champ]) => o[champ] != null)
              .map(([champ, label]) => `${label} ${o[champ]}%`)
              .join(' · ') || 'Aucune occupation renseignée'}
          </p>
          {o.score_ponte != null && (
            <p className="text-ink-secondary">
              Ponte : {o.score_ponte} — {PONTE_CADRE_LIBELLES[o.score_ponte]}
            </p>
          )}
          {o.cellules_royales_nb > 0 && (
            <p className="text-action-ink">
              Cellules royales : {o.cellules_royales_nb}
              {o.cellules_royales_type &&
                ` (${CELLULES_ROYALES_TYPE_LIBELLES[o.cellules_royales_type] ?? o.cellules_royales_type})`}
              {o.cellules_royales_pos &&
                ` — ${CELLULES_ROYALES_POS_LIBELLES[o.cellules_royales_pos] ?? o.cellules_royales_pos}`}
            </p>
          )}
          {o.signes?.length > 0 && (
            <p className="text-action-ink">
              Signes : {o.signes.map((s) => SIGNES_SANITAIRES_LIBELLES[s] ?? s).join(', ')}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function LigneVisite({ evenement, cadresOuverts, onBasculerCadres }) {
  const visite = evenement.visite;
  const precedente = evenement.precedente;
  const ecartJours = precedente
    ? Math.round(
        (new Date(visite.date).getTime() - new Date(precedente.date).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <li className="p-3">
      <p className="text-15 font-bold">{dateHeureLisible(visite)}</p>
      <p className="text-11 text-ink-muted mb-2">
        {ecartJours === null
          ? 'Première visite enregistrée'
          : ecartJours === 0
            ? 'Le même jour que la précédente'
            : `${ecartJours} j après la précédente`}
        {visite.source_agregats === 'calcule_depuis_cadres' &&
          ' · couvain/provisions/ponte calculés depuis les cadres'}
      </p>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-13 font-mono">
        <dt className="text-ink-secondary font-sans">Couvain operculé</dt>
        <dd>
          {champAvecEcart(visite.nb_cadres_couvain_opercule, precedente?.nb_cadres_couvain_opercule)}
        </dd>
        <dt className="text-ink-secondary font-sans">Couvain ouvert</dt>
        <dd>{champAvecEcart(visite.nb_cadres_couvain_ouvert, precedente?.nb_cadres_couvain_ouvert)}</dd>
        <dt className="text-ink-secondary font-sans">Provisions</dt>
        <dd>{champAvecEcart(visite.nb_cadres_provisions, precedente?.nb_cadres_provisions)}</dd>
        <dt className="text-ink-secondary font-sans">Population</dt>
        <dd>{champAvecEcart(visite.population, precedente?.population)}</dd>
        <dt className="text-ink-secondary font-sans">Tempérament</dt>
        <dd>{champAvecEcart(visite.temperament, precedente?.temperament)}</dd>
        <dt className="text-ink-secondary font-sans">Bâtisse</dt>
        <dd>{champAvecEcart(visite.batisse, precedente?.batisse)}</dd>
        <dt className="text-ink-secondary font-sans">Ponte</dt>
        <dd>
          {visite.score_ponte != null
            ? `${champAvecEcart(visite.score_ponte, precedente?.score_ponte)} — ${PONTE_ECHELLE_LIBELLES[visite.score_ponte]}`
            : 'non observé'}
        </dd>
        <dt className="text-ink-secondary font-sans">Reine vue</dt>
        <dd>{visite.reine_vue == null ? 'non observé' : visite.reine_vue ? 'Oui' : 'Non'}</dd>
        <dt className="text-ink-secondary font-sans">Œufs vus</dt>
        <dd>{visite.oeufs_vus == null ? 'non observé' : visite.oeufs_vus ? 'Oui' : 'Non'}</dd>
      </dl>

      {visite.cellules_royales_nb > 0 && (
        <p className="text-13 text-action-ink mt-2">
          Cellules royales : {visite.cellules_royales_nb}
          {visite.cellules_royales_type &&
            ` (${CELLULES_ROYALES_TYPE_LIBELLES[visite.cellules_royales_type] ?? visite.cellules_royales_type})`}
        </p>
      )}

      {visite.anomalies?.length > 0 && (
        <p className="text-13 text-action-ink mt-2">
          Anomalies : {visite.anomalies.map((a) => ANOMALIE_LIBELLES[a] ?? a).join(', ')}
        </p>
      )}

      {visite.signes_sanitaires?.length > 0 && (
        <p className="text-13 text-action-ink mt-2">
          Signes observés :{' '}
          {visite.signes_sanitaires.map((s) => SIGNES_SANITAIRES_LIBELLES[s] ?? s).join(', ')}
        </p>
      )}

      {visite.suspicion_reglementee && (
        <p className="text-13 text-urgent-ink font-bold mt-2">
          Suspicion réglementée signalée lors de cette visite
        </p>
      )}

      {visite.priorite && (
        <p className="text-13 text-ink-secondary mt-2">
          Priorité : {visite.priorite[0].toUpperCase() + visite.priorite.slice(1)}
        </p>
      )}

      {visite.action_entreprise && (
        <p className="text-13 text-ink-secondary mt-1">Action entreprise : {visite.action_entreprise}</p>
      )}

      {visite.observation_libre && (
        <p className="text-13 text-ink-secondary mt-2 italic">« {visite.observation_libre} »</p>
      )}

      <PhotosVisite visiteId={visite.id} />

      {evenement.cadres.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => onBasculerCadres(visite.id)}
            className="text-13 text-ink-secondary underline mt-2"
          >
            {cadresOuverts ? '▾' : '▸'} Détail cadre par cadre ({evenement.cadres.length} face
            {evenement.cadres.length > 1 ? 's' : ''})
          </button>
          {cadresOuverts && <DetailCadre observations={evenement.cadres} />}
        </>
      )}
    </li>
  );
}

function LigneTraitement({ traitement: t }) {
  return (
    <li className="p-3">
      <p className="text-15 font-bold">Traitement{t.produit ? ` — ${t.produit}` : ''}</p>
      <p className="text-11 text-ink-muted mb-2">
        {dateLisible(t.date_debut) ?? 'date non renseignée'}
        {t.date_fin && t.date_fin !== t.date_debut ? ` → ${dateLisible(t.date_fin)}` : ''}
      </p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-13 font-mono">
        {t.voie && (
          <>
            <dt className="text-ink-secondary font-sans">Voie</dt>
            <dd>{VOIE_LIBELLES[t.voie] ?? t.voie}</dd>
          </>
        )}
        {t.dosage && (
          <>
            <dt className="text-ink-secondary font-sans">Dosage</dt>
            <dd>{t.dosage}</dd>
          </>
        )}
        {t.delai_attente_jours != null && (
          <>
            <dt className="text-ink-secondary font-sans">Délai d'attente</dt>
            <dd>{t.delai_attente_jours} j</dd>
          </>
        )}
      </dl>
      {t.conforme_bio && <p className="text-13 text-action-ink mt-2">Conforme bio</p>}
      {t.notes && <p className="text-13 text-ink-secondary mt-2 italic">« {t.notes} »</p>}
    </li>
  );
}

function LigneComptageVarroa({ comptage: c }) {
  return (
    <li className="p-3">
      <p className="text-15 font-bold">Comptage varroa</p>
      <p className="text-11 text-ink-muted mb-2">{dateLisible(c.date) ?? 'date non renseignée'}</p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-13 font-mono">
        {c.methode && (
          <>
            <dt className="text-ink-secondary font-sans">Méthode</dt>
            <dd>{METHODE_LIBELLES[c.methode] ?? c.methode}</dd>
          </>
        )}
        {c.varroas_par_jour != null && (
          <>
            <dt className="text-ink-secondary font-sans">Varroas/jour</dt>
            <dd>{c.varroas_par_jour.toFixed(2)}</dd>
          </>
        )}
      </dl>
      {c.niveau_alerte && (
        <p className="text-13 font-bold mt-2">Niveau d'alerte : {NIVEAU_ALERTE_LIBELLES[c.niveau_alerte]}</p>
      )}
    </li>
  );
}

function LigneNourrissement({ nourrissement: n }) {
  return (
    <li className="p-3">
      <p className="text-15 font-bold">
        Nourrissement{n.type ? ` — ${TYPE_NOURRISSEMENT_LIBELLES[n.type] ?? n.type}` : ''}
      </p>
      <p className="text-11 text-ink-muted mb-2">{dateLisible(n.date) ?? 'date non renseignée'}</p>
      {n.quantite != null && (
        <p className="text-13 text-ink-secondary">
          Quantité : {n.quantite}
          {n.unite ? ` ${n.unite}` : ''}
        </p>
      )}
      {n.origine_produit && (
        <p className="text-13 text-ink-secondary">Origine : {ORIGINE_LIBELLES[n.origine_produit]}</p>
      )}
    </li>
  );
}

function LigneRecolte({ recolte: r }) {
  return (
    <li className="p-3">
      <p className="text-15 font-bold">
        {PRODUIT_LIBELLES[r.produit] ?? r.produit ?? 'Récolte'}
        {r.poids_net != null ? ` — ${r.poids_net} kg` : ''}
      </p>
      <p className="text-11 text-ink-muted mb-2">
        {dateLisible(r.date) ?? 'date non renseignée'}
        {r.mode_saisie ? ` · ${MODE_SAISIE_LIBELLES[r.mode_saisie] ?? r.mode_saisie}` : ''}
      </p>
      {r.type_miellee && <p className="text-13 text-ink-secondary">Miellée : {r.type_miellee}</p>}
    </li>
  );
}

function LigneMouvement({ mouvement: m, rucherOrigineNom, rucherDestinationNom }) {
  return (
    <li className="p-3">
      <p className="text-15 font-bold">{TYPE_MOUVEMENT_LIBELLES[m.type] ?? m.type ?? 'Mouvement'}</p>
      <p className="text-11 text-ink-muted mb-2">{dateLisible(m.date) ?? 'date non renseignée'}</p>
      {(rucherOrigineNom || rucherDestinationNom) && (
        <p className="text-13 text-ink-secondary">
          {rucherOrigineNom ?? '?'} → {rucherDestinationNom ?? '?'}
        </p>
      )}
      {m.motif && <p className="text-13 text-ink-secondary">Motif : {m.motif}</p>}
    </li>
  );
}

export function Historique({ colonieId, onRetour }) {
  const [ruche, setRuche] = useState(null);
  const [saisons, setSaisons] = useState(null); // null = en cours de chargement
  const [cadresOuverts, setCadresOuverts] = useState(new Set());

  useEffect(() => {
    if (!colonieId) return;
    async function charger() {
      const colonie = await db.colonie.get(colonieId);
      const r = colonie ? await db.ruche.get(colonie.ruche_id) : null;
      setRuche(r ?? null);
      setSaisons(await listerHistoriqueConsolideColonie(colonieId));
    }
    charger();
    // Se recharge tout seul quand une synchronisation en arrière-plan a pu
    // apporter de nouvelles données depuis un autre appareil.
    return surSync(charger);
  }, [colonieId]);

  function basculerCadres(visiteId) {
    setCadresOuverts((precedent) => {
      const suivant = new Set(precedent);
      if (suivant.has(visiteId)) suivant.delete(visiteId);
      else suivant.add(visiteId);
      return suivant;
    });
  }

  if (saisons === null) return null;

  const totalEvenements = saisons.reduce((n, s) => n + s.evenements.length, 0);

  return (
    <div className="min-h-screen bg-ground text-ink p-4 flex flex-col gap-4 max-w-md mx-auto">
      <header className="flex flex-col gap-1">
        <BoutonRetour onRetour={onRetour} />
        <h1 className="text-20 font-bold">
          {ruche ? `Ruche ${ruche.numero}` : 'Colonie'} — Historique
        </h1>
        <p className="text-13 text-ink-secondary">
          Visites, sanitaire, récoltes et mouvements consolidés par saison apicole (avril à mars).
        </p>
      </header>

      {totalEvenements === 0 && (
        <p className="text-13 text-ink-secondary">Aucun événement enregistré pour cette colonie.</p>
      )}

      {saisons.map((saison) => (
        <section key={saison.label} className="flex flex-col gap-2">
          <h2 className="text-15 font-bold border-b border-rule pb-1">Saison {saison.label}</h2>
          <ul className="bg-surface rounded border border-rule divide-y divide-rule">
            {saison.evenements.map((evenement) => {
              switch (evenement._type) {
                case 'visite':
                  return (
                    <LigneVisite
                      key={evenement.visite.id}
                      evenement={evenement}
                      cadresOuverts={cadresOuverts.has(evenement.visite.id)}
                      onBasculerCadres={basculerCadres}
                    />
                  );
                case 'traitement':
                  return <LigneTraitement key={evenement.traitement.id} traitement={evenement.traitement} />;
                case 'comptage_varroa':
                  return (
                    <LigneComptageVarroa key={evenement.comptage.id} comptage={evenement.comptage} />
                  );
                case 'nourrissement':
                  return (
                    <LigneNourrissement
                      key={evenement.nourrissement.id}
                      nourrissement={evenement.nourrissement}
                    />
                  );
                case 'recolte':
                  return <LigneRecolte key={evenement.recolte.id} recolte={evenement.recolte} />;
                case 'mouvement':
                  return (
                    <LigneMouvement
                      key={evenement.mouvement.id}
                      mouvement={evenement.mouvement}
                      rucherOrigineNom={evenement.rucherOrigineNom}
                      rucherDestinationNom={evenement.rucherDestinationNom}
                    />
                  );
                default:
                  return null;
              }
            })}
          </ul>
        </section>
      ))}

      {onRetour && (
        <button
          type="button"
          onClick={onRetour}
          className="h-12 w-full text-13 text-ink-secondary underline"
        >
          Retour à la vue d'ensemble
        </button>
      )}
    </div>
  );
}
