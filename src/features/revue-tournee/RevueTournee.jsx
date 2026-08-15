import { useEffect, useState } from 'react';
import { Compteur } from '../../components/Compteur.jsx';
import { Segmente } from '../../components/Segmente.jsx';
import { Interrupteur } from '../../components/Interrupteur.jsx';
import { Chips } from '../../components/Chips.jsx';
import { BoutonRetour } from '../../components/BoutonRetour.jsx';
import { db } from '../../db/db.js';
import { obtenirRucher } from '../../db/repositories/ruchers.js';
import { listerAudioColonie, rattacherVisite } from '../../db/repositories/audio.js';
import { enregistrerVisite } from '../../db/repositories/visites.js';
import { enregistrerTraitement, enregistrerNourrissement } from '../../db/repositories/sanitaire.js';
import { structurerDictee } from '../../lib/structurationIA.js';
import { VOIE_LIBELLES, TYPE_NOURRISSEMENT_LIBELLES } from '../../lib/libellesSanitaire.js';
import {
  creerTacheSuspicionSiNecessaire,
  creerRappelsInterventionSiNecessaire,
} from '../../lib/reglesVisite.js';

const ANOMALIE_OPTIONS = [
  { value: 'bourdonneuse', label: 'Bourdonneuse' },
  { value: 'orpheline', label: 'Orpheline' },
  { value: 'pillage', label: 'Pillage' },
  { value: 'fausse_teigne', label: 'Fausse teigne' },
  { value: 'mortalite_anormale', label: 'Mortalité anormale' },
  { value: 'diarrhee', label: 'Diarrhée' },
  { value: 'abeilles_tremblantes', label: 'Abeilles noires tremblantes' },
  { value: 'ponte_males', label: 'Ponte de mâles' },
  { value: 'autre', label: 'Autre' },
];

const PONTE_ECHELLE_OPTIONS = [0, 1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }));
const ECHELLE_1_A_5 = [1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }));

// Périmètre volontairement limité aux champs que l'IA peut proposer (visite
// + traitements + nourrissements, cf. la fonction Edge structurer-dictee) —
// cellules royales, signes sanitaires et photos n'entrent pas dans la
// dictée de cette passe : à saisir manuellement (écran B) si besoin.
function CarteColonieRevue({ ruche, colonie, audio, onEnregistre }) {
  const [statut, setStatut] = useState('a_structurer');
  const [valeurs, setValeurs] = useState({});
  const [anomalies, setAnomalies] = useState([]);
  const [observationLibre, setObservationLibre] = useState('');
  const [traitements, setTraitements] = useState([]);
  const [nourrissements, setNourrissements] = useState([]);
  const [message, setMessage] = useState(null);

  async function structurer() {
    setStatut('structuration_en_cours');
    setMessage(null);
    try {
      const champs = await structurerDictee(audio.transcription_brute);
      setValeurs({
        nb_cadres_couvain_opercule: champs.nb_cadres_couvain_opercule ?? null,
        nb_cadres_provisions: champs.nb_cadres_provisions ?? null,
        population: champs.population ?? null,
        reine_vue: champs.reine_vue ?? null,
        oeufs_vus: champs.oeufs_vus ?? null,
        temperament: champs.temperament ?? null,
        batisse: champs.batisse ?? null,
        score_ponte: champs.score_ponte ?? null,
      });
      setAnomalies(champs.anomalies ?? []);
      setObservationLibre(champs.observation_libre ?? '');
      setTraitements(champs.traitements ?? []);
      setNourrissements(champs.nourrissements ?? []);
      setStatut('a_revoir');
    } catch (err) {
      console.error('[revue tournée] échec structuration', err);
      setMessage("Échec de la structuration IA — réessaie, ou saisis cette colonie manuellement.");
      setStatut('a_structurer');
    }
  }

  function modifierChamp(champ, valeur) {
    setValeurs((v) => ({ ...v, [champ]: valeur }));
  }

  function retirerTraitement(index) {
    setTraitements((liste) => liste.filter((_, i) => i !== index));
  }

  function retirerNourrissement(index) {
    setNourrissements((liste) => liste.filter((_, i) => i !== index));
  }

  async function enregistrer() {
    try {
      const maintenant = new Date();
      const visite = {
        id: crypto.randomUUID(),
        colonie_id: colonie.id,
        date: maintenant.toISOString(),
        heure: maintenant.toTimeString().slice(0, 5),
        type: 'controle_routine',
        nb_cadres_couvain_opercule: valeurs.nb_cadres_couvain_opercule ?? null,
        nb_cadres_couvain_ouvert: null,
        nb_cadres_provisions: valeurs.nb_cadres_provisions ?? null,
        population: valeurs.population ?? null,
        reine_vue: valeurs.reine_vue ?? null,
        oeufs_vus: valeurs.oeufs_vus ?? null,
        temperament: valeurs.temperament ?? null,
        batisse: valeurs.batisse ?? null,
        cellules_royales_nb: 0,
        cellules_royales_type: null,
        hausses_posees: false,
        anomalies,
        score_ponte: valeurs.score_ponte ?? null,
        signes_sanitaires: [],
        suspicion_reglementee: false,
        source_agregats: 'saisie_directe',
        observation_libre: observationLibre || null,
        provenance_champs: null,
        created_at: maintenant.toISOString(),
        updated_at: maintenant.toISOString(),
        deleted_at: null,
      };
      await enregistrerVisite(visite);
      await rattacherVisite(audio.id, visite.id);
      // Mêmes règles §6.3 / suspicion catégorie 1 que l'écran de saisie
      // manuelle (src/lib/reglesVisite.js) — "cadre de couvain introduit"
      // n'existe pas dans le périmètre de cet écran (cf. commentaire de
      // CarteColonieRevue ci-dessus), donc jamais transmis ici.
      await creerTacheSuspicionSiNecessaire(visite, {
        rucherId: ruche.rucher_id ?? null,
        rucheNumero: ruche.numero,
      });
      await creerRappelsInterventionSiNecessaire(visite, {
        rucherId: ruche.rucher_id ?? null,
      });

      // Pas de délai d'attente extrait de la dictée (jamais demandé au
      // modèle) : aucun rappel automatique généré ici — cohérent avec
      // SaisieTraitement.jsx, qui ne déclenche un rappel que si un délai
      // réel est renseigné.
      for (const t of traitements) {
        const maintenantTraitement = new Date().toISOString();
        await enregistrerTraitement({
          id: crypto.randomUUID(),
          colonie_id: colonie.id,
          date_debut: maintenant.toISOString().slice(0, 10),
          date_fin: maintenant.toISOString().slice(0, 10),
          produit: t.produit || null,
          numero_amm: null,
          numero_lot: null,
          dosage: t.dosage || null,
          voie: t.voie || null,
          motif: t.motif || null,
          delai_attente_jours: null,
          date_fin_delai_attente: null,
          ordonnance_document_id: null,
          conforme_bio: null,
          notes: null,
          created_at: maintenantTraitement,
          updated_at: maintenantTraitement,
          deleted_at: null,
        });
      }

      for (const n of nourrissements) {
        const maintenantNourrissement = new Date().toISOString();
        await enregistrerNourrissement({
          id: crypto.randomUUID(),
          colonie_id: colonie.id,
          date: maintenant.toISOString().slice(0, 10),
          type: n.type || null,
          quantite: n.quantite ?? null,
          unite: n.unite || null,
          composition: n.composition || null,
          origine_produit: null,
          notes: null,
          created_at: maintenantNourrissement,
          updated_at: maintenantNourrissement,
          deleted_at: null,
        });
      }

      setStatut('enregistre');
      setMessage('Visite enregistrée.');
      onEnregistre?.();
    } catch (err) {
      console.error('[revue tournée] échec enregistrement', err);
      setMessage("Erreur : la visite n'a pas pu être enregistrée.");
    }
  }

  return (
    <div className="border border-rule rounded p-3 flex flex-col gap-3">
      <p className="text-15 font-bold">Ruche {ruche.numero}</p>
      <p className="text-13 text-ink-secondary italic">« {audio.transcription_brute} »</p>

      {statut === 'a_structurer' && (
        <button
          type="button"
          onClick={structurer}
          className="h-10 w-full rounded bg-ink text-surface text-15 font-bold"
        >
          Structurer avec l'IA
        </button>
      )}

      {statut === 'structuration_en_cours' && (
        <p className="text-13 text-ink-secondary">Structuration en cours…</p>
      )}

      {statut === 'a_revoir' && (
        <>
          <Compteur
            label="Cadres de couvain"
            value={valeurs.nb_cadres_couvain_opercule}
            onChange={(v) => modifierChamp('nb_cadres_couvain_opercule', v)}
          />
          <Compteur
            label="Provisions"
            value={valeurs.nb_cadres_provisions}
            onChange={(v) => modifierChamp('nb_cadres_provisions', v)}
          />
          <div>
            <p className="text-13 text-ink-secondary mb-1">Population</p>
            <Segmente
              options={ECHELLE_1_A_5}
              value={valeurs.population}
              onChange={(v) => modifierChamp('population', v)}
            />
          </div>
          <div>
            <p className="text-13 text-ink-secondary mb-1">Tempérament</p>
            <Segmente
              options={ECHELLE_1_A_5}
              value={valeurs.temperament}
              onChange={(v) => modifierChamp('temperament', v)}
            />
          </div>
          <div>
            <p className="text-13 text-ink-secondary mb-1">Bâtisse</p>
            <Segmente
              options={ECHELLE_1_A_5}
              value={valeurs.batisse}
              onChange={(v) => modifierChamp('batisse', v)}
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <Interrupteur
                label="Reine vue"
                value={valeurs.reine_vue}
                provenance={valeurs.reine_vue == null ? 'vide' : 'saisi'}
                onChange={(v) => modifierChamp('reine_vue', v)}
              />
            </div>
            <div className="flex-1">
              <Interrupteur
                label="Œufs vus"
                value={valeurs.oeufs_vus}
                provenance={valeurs.oeufs_vus == null ? 'vide' : 'saisi'}
                onChange={(v) => modifierChamp('oeufs_vus', v)}
              />
            </div>
          </div>
          <div>
            <p className="text-13 text-ink-secondary mb-1">Ponte</p>
            <Segmente
              options={PONTE_ECHELLE_OPTIONS}
              value={valeurs.score_ponte}
              onChange={(v) => modifierChamp('score_ponte', v)}
            />
          </div>
          <div>
            <p className="text-13 text-ink-secondary mb-1">Anomalies</p>
            <Chips options={ANOMALIE_OPTIONS} value={anomalies} onChange={setAnomalies} />
          </div>
          <div>
            <label className="text-13 text-ink-secondary mb-1 block">Note libre</label>
            <textarea
              className="w-full border border-rule-strong rounded p-2 text-15 bg-surface text-ink"
              rows={2}
              value={observationLibre}
              onChange={(e) => setObservationLibre(e.target.value)}
            />
          </div>

          {traitements.length > 0 && (
            <div className="border border-rule rounded p-3 flex flex-col gap-2">
              <p className="text-13 font-bold text-ink-secondary">
                Traitement(s) détecté(s) dans la dictée
              </p>
              {traitements.map((t, index) => (
                <div key={index} className="flex items-start justify-between gap-2 text-13">
                  <span>
                    {t.produit || 'Produit non précisé'}
                    {t.voie && ` — ${VOIE_LIBELLES[t.voie] ?? t.voie}`}
                    {t.dosage && ` — ${t.dosage}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => retirerTraitement(index)}
                    className="text-12 text-ink-secondary underline shrink-0"
                  >
                    Retirer
                  </button>
                </div>
              ))}
            </div>
          )}

          {nourrissements.length > 0 && (
            <div className="border border-rule rounded p-3 flex flex-col gap-2">
              <p className="text-13 font-bold text-ink-secondary">
                Nourrissement(s) détecté(s) dans la dictée
              </p>
              {nourrissements.map((n, index) => (
                <div key={index} className="flex items-start justify-between gap-2 text-13">
                  <span>
                    {n.type ? TYPE_NOURRISSEMENT_LIBELLES[n.type] ?? n.type : 'Type non précisé'}
                    {n.quantite != null && ` — ${n.quantite}${n.unite ? ` ${n.unite}` : ''}`}
                    {n.composition && ` (${n.composition})`}
                  </span>
                  <button
                    type="button"
                    onClick={() => retirerNourrissement(index)}
                    className="text-12 text-ink-secondary underline shrink-0"
                  >
                    Retirer
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={enregistrer}
            className="h-[46px] w-full rounded bg-ink text-surface text-15 font-bold"
          >
            Confirmer et enregistrer la visite
          </button>
        </>
      )}

      {statut === 'enregistre' && (
        <p className="text-13 text-action-ink font-bold">✓ Visite enregistrée</p>
      )}

      {message && <p className="text-13 text-center text-ink-secondary">{message}</p>}
    </div>
  );
}

export function RevueTournee({ rucherId, onRetour, onOuvrirSaisieVisite }) {
  const [rucher, setRucher] = useState(null);
  const [aRevoir, setARevoir] = useState([]);
  const [absentes, setAbsentes] = useState([]);
  const [chargement, setChargement] = useState(true);

  async function charger() {
    const r = await obtenirRucher(rucherId);
    if (!r) {
      setRucher(null);
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

    const listeARevoir = [];
    const listeAbsentes = [];

    for (let i = 0; i < ordre.length; i++) {
      const ruche = ruches[i];
      const colonie = colonieParRuche.get(ordre[i]);
      if (!ruche || !colonie) continue;

      const audios = await listerAudioColonie(colonie.id);
      // Le plus récent audio non encore rattaché à une visite (L2.4 : un
      // enregistrement à la fois par colonie — recommencer écrase l'ancien
      // côté saisie, mais plusieurs lignes peuvent subsister ici).
      const dernier = audios[audios.length - 1];

      if (!dernier || !dernier.transcription_brute) {
        listeAbsentes.push({ ruche, colonie });
      } else if (!dernier.visite_id) {
        listeARevoir.push({ ruche, colonie, audio: dernier });
      }
      // Si dernier.visite_id existe déjà : déjà traité, on ne le montre plus.
    }

    setARevoir(listeARevoir);
    setAbsentes(listeAbsentes);
    setChargement(false);
  }

  useEffect(() => {
    charger();
  }, [rucherId]);

  if (chargement) return null;

  if (!rucher) {
    return <p className="p-4 text-13 text-ink-secondary">Aucun rucher trouvé.</p>;
  }

  return (
    <div className="min-h-screen bg-ground text-ink p-4 flex flex-col gap-4 max-w-md mx-auto">
      <header className="flex flex-col gap-1">
        <BoutonRetour onRetour={onRetour} />
        <h1 className="text-20 font-bold">Revue de tournée</h1>
        <p className="text-13 text-ink-secondary">
          Chaque proposition de l'IA est à relire avant d'être enregistrée — rien n'est écrit
          automatiquement.
        </p>
      </header>

      {absentes.length > 0 && (
        <section className="border border-rule-strong rounded p-3 bg-action-bg">
          <p className="text-13 font-bold text-action-ink mb-2">
            {absentes.length} colonie(s) sans dictée
          </p>
          <ul className="flex flex-col gap-1">
            {absentes.map(({ ruche, colonie }) => (
              <li key={colonie.id} className="flex items-center justify-between">
                <span className="text-13 text-action-ink">Ruche {ruche.numero}</span>
                {onOuvrirSaisieVisite && (
                  <button
                    type="button"
                    onClick={() => onOuvrirSaisieVisite(colonie.id)}
                    className="text-12 text-action-ink underline"
                  >
                    Saisir manuellement
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {aRevoir.length === 0 && absentes.length === 0 && (
        <p className="text-13 text-ink-secondary">
          Rien à revoir — toutes les colonies de la tournée ont déjà une visite enregistrée.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {aRevoir.map(({ ruche, colonie, audio }) => (
          <CarteColonieRevue
            key={colonie.id}
            ruche={ruche}
            colonie={colonie}
            audio={audio}
            onEnregistre={charger}
          />
        ))}
      </div>

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
