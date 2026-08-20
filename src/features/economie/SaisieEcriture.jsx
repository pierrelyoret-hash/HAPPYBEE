import { useEffect, useMemo, useState } from 'react';
import { EnTeteEcran } from '../../components/EnTeteEcran.jsx';
import { Segmente } from '../../components/Segmente.jsx';
import { obtenirSaison } from '../../lib/saison.js';
import { comprimerImage } from '../../lib/compressionImage.js';
import {
  listerCategories,
  listerTiers,
  creerEcriture,
  modifierEcriture,
  obtenirDerniereEcritureSaisie,
  enregistrerJustificatif,
} from '../../db/repositories/economie.js';
import { creerImmobilisation } from '../../db/repositories/immobilisations.js';
import { listerRuchers } from '../../db/repositories/ruchers.js';
import { listerToutesLesRuches } from '../../db/repositories/ruches.js';
import {
  recalculerEcriture,
  calculerMontants,
  estActiveSurExercice,
  obtenirKgMielParRuche,
} from '../../lib/repartitionEconomique.js';

const SENS_OPTIONS = [
  { value: 'depense', label: 'Dépense' },
  { value: 'produit', label: 'Produit' },
];

const NATURE_OPTIONS_DEPENSE = [
  { value: 'charge_directe', label: 'Charge directe' },
  { value: 'charge_indirecte', label: 'Charge indirecte' },
  { value: 'investissement_amortissable', label: 'Investissement (amortissable)' },
];

const MODE_REGLEMENT_OPTIONS = [
  { value: 'especes', label: 'Espèces' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'virement', label: 'Virement' },
  { value: 'carte', label: 'Carte' },
];

const NIVEAU_OPTIONS = [
  { value: 'exploitation', label: 'Exploitation' },
  { value: 'rucher', label: 'Rucher' },
  { value: 'ruches', label: 'Sélection de ruches' },
];

const CLE_OPTIONS = [
  { value: 'egale', label: 'Égale' },
  { value: 'prorata_production', label: 'Prorata production' },
  { value: 'prorata_nb_ruches', label: 'Prorata nb ruches' },
  { value: 'manuelle', label: 'Manuelle' },
];

const CHAMP_CLASSE = 'w-full h-11 text-15 border border-rule-strong rounded px-2 bg-surface text-ink';

function dateDuJour() {
  return new Date().toISOString().slice(0, 10);
}

// Parcours principal du lot (brief_L4_economique.md §7) : dépense ou
// produit, montant, affectation, sur un seul écran — "l'affectation ne doit
// pas être un second formulaire" (§7). Pensé bureau (cadrage_ux_L4 §1) :
// conteneur plus large que les écrans de terrain, mais praticable à 375 px
// (rien en dessous de 44 px, aucune dépendance au survol).
export function SaisieEcriture({ onRetour }) {
  const [sens, setSens] = useState('depense');
  const [montant, setMontant] = useState('');
  const [date, setDate] = useState(dateDuJour());
  const [libelle, setLibelle] = useState('');
  const [categorieId, setCategorieId] = useState(null);
  const [tiersId, setTiersId] = useState(null);
  const [modeReglement, setModeReglement] = useState(null);
  const [nature, setNature] = useState('charge_directe');
  const [dureeAmortissement, setDureeAmortissement] = useState('5');
  const [niveauAffectation, setNiveauAffectation] = useState('exploitation');
  const [rucherId, setRucherId] = useState(null);
  const [rucheIdsSelection, setRucheIdsSelection] = useState([]);
  const [cleRepartition, setCleRepartition] = useState('egale');
  const [pourcentages, setPourcentages] = useState({});
  const [photo, setPhoto] = useState(null);
  const [compressionEnCours, setCompressionEnCours] = useState(false);
  const [message, setMessage] = useState(null);

  const [categories, setCategories] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [ruchers, setRuchers] = useState([]);
  const [toutesLesRuches, setToutesLesRuches] = useState([]);
  const [previewLignes, setPreviewLignes] = useState([]);
  const [previewEnCours, setPreviewEnCours] = useState(false);

  const exercice = useMemo(() => obtenirSaison(date || dateDuJour())?.debut, [date]);
  const natureEffective = sens === 'produit' ? 'produit' : nature;

  useEffect(() => {
    async function charger() {
      setRuchers(await listerRuchers());
      setToutesLesRuches(await listerToutesLesRuches());
      const derniere = await obtenirDerniereEcritureSaisie();
      if (derniere) {
        setTiersId(derniere.tiers_id);
        setModeReglement(derniere.mode_reglement);
      }
    }
    charger();
  }, []);

  useEffect(() => {
    async function chargerCategories() {
      setCategories(await listerCategories(sens));
      setCategorieId(null);
    }
    chargerCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sens]);

  useEffect(() => {
    async function chargerTiers() {
      setTiers(await listerTiers());
    }
    chargerTiers();
  }, []);

  // Population de ruches concernées, dérivée du niveau d'affectation — même
  // logique que determinerRuchesConcernees (lib/repartitionEconomique.js),
  // dupliquée ici en lecture seule pour la prévisualisation avant
  // enregistrement (l'écriture n'existe pas encore, rien à relire en base).
  const populationRuches = useMemo(() => {
    if (niveauAffectation === 'exploitation') return toutesLesRuches;
    if (niveauAffectation === 'rucher') return toutesLesRuches.filter((r) => r.rucher_id === rucherId);
    return toutesLesRuches.filter((r) => rucheIdsSelection.includes(r.id));
  }, [niveauAffectation, rucherId, rucheIdsSelection, toutesLesRuches]);

  // Éclatement visible avant validation (cadrage UX L4 §3 point 4).
  useEffect(() => {
    let annule = false;
    async function calculerPreview() {
      setPreviewEnCours(true);
      let population = populationRuches;
      if (cleRepartition === 'prorata_nb_ruches') {
        population = population.filter((r) => estActiveSurExercice(r, exercice));
      }
      const rucheIds = population.map((r) => r.id);
      const kgParRuche =
        cleRepartition === 'prorata_production' && exercice != null
          ? await obtenirKgMielParRuche(rucheIds, exercice)
          : {};
      if (annule) return;
      const lignes = calculerMontants(cleRepartition, Number(montant) || 0, rucheIds, {
        kgParRuche,
        pourcentagesManuels: pourcentages,
      });
      setPreviewLignes(lignes.map((l) => ({ ...l, numero: toutesLesRuches.find((r) => r.id === l.ruche_id)?.numero })));
      setPreviewEnCours(false);
    }
    calculerPreview();
    return () => {
      annule = true;
    };
  }, [populationRuches, cleRepartition, montant, pourcentages, exercice, toutesLesRuches]);

  const sommePourcentages = populationRuches.reduce((s, r) => s + (Number(pourcentages[r.id]) || 0), 0);

  function basculerSelectionRuche(rucheId) {
    setRucheIdsSelection((sel) => (sel.includes(rucheId) ? sel.filter((id) => id !== rucheId) : [...sel, rucheId]));
  }

  async function ajouterPhoto(fichier) {
    setCompressionEnCours(true);
    try {
      const blob = await comprimerImage(fichier);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
    } finally {
      setCompressionEnCours(false);
    }
  }

  function retirerPhoto() {
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto(null);
  }

  async function enregistrer() {
    try {
      let immobilisationId = null;
      if (natureEffective === 'investissement_amortissable') {
        immobilisationId = await creerImmobilisation({
          libelle: libelle || 'Immobilisation',
          date_acquisition: date,
          valeur_acquisition: Number(montant) || 0,
          duree_amortissement_annees: Number(dureeAmortissement) || 1,
          mode: 'lineaire',
          date_sortie: null,
          valeur_residuelle: null,
          justificatif_document_id: null,
        });
      }

      const ecritureId = await creerEcriture({
        date,
        libelle: libelle || null,
        sens,
        montant: Number(montant) || 0,
        categorie_id: categorieId,
        tiers_id: tiersId,
        mode_reglement: modeReglement,
        // Justificatif attaché juste après (l'écriture doit exister pour
        // servir d'entité liée au document).
        justificatif_document_id: null,
        niveau_affectation: niveauAffectation,
        rucher_id: niveauAffectation === 'rucher' ? rucherId : null,
        cle_repartition: cleRepartition,
        nature: natureEffective,
        immobilisation_id: immobilisationId,
        exercice,
        // Capté par le modèle (§4.3), aucun écran ne le présente comme
        // utile (brief §4, exclusions) — aucune saisie construite dans
        // cette passe, comme ordonnance_document_id sur `traitement`.
        origine_production: null,
      });

      if (photo) {
        const documentId = await enregistrerJustificatif({
          entiteLieeType: 'ecriture',
          entiteLieeId: ecritureId,
          blob: photo.blob,
        });
        await modifierEcriture(ecritureId, { justificatif_document_id: documentId });
      }

      await recalculerEcriture(
        { id: ecritureId, niveau_affectation: niveauAffectation, rucher_id: rucherId, cle_repartition: cleRepartition, montant: Number(montant) || 0, exercice },
        {
          rucheIdsSelection: niveauAffectation === 'ruches' ? rucheIdsSelection : null,
          pourcentagesManuels: cleRepartition === 'manuelle' ? pourcentages : null,
        }
      );

      setMessage('Écriture enregistrée.');
      // Formulaire vierge pour la saisie en série (cadrage UX L4 §4) — le
      // tiers, la catégorie, le mode de règlement, le niveau et la clé
      // restent (pile de factures similaires) ; montant/libellé/photo/
      // pourcentages repartent à vide.
      setMontant('');
      setLibelle('');
      retirerPhoto();
      setPourcentages({});
    } catch (err) {
      console.error('[economie] échec enregistrement écriture', err);
      setMessage("Erreur : l'écriture n'a pas pu être enregistrée.");
    }
  }

  return (
    <div className="min-h-screen bg-ground text-ink flex flex-col max-w-3xl mx-auto">
      <EnTeteEcran retourLibelle="← Retour" onRetour={onRetour} titre="Saisir une écriture" contexte={exercice ? `Exercice ${exercice}-${exercice + 1}` : null} />

      <div className="p-4 flex flex-col gap-4">
        <Segmente options={SENS_OPTIONS} value={sens} onChange={setSens} />

        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[140px]">
            <label className="text-13 text-ink-secondary mb-1 block" htmlFor="montant">
              Montant (€)
            </label>
            <input
              id="montant"
              type="number"
              step="0.01"
              autoFocus
              className={CHAMP_CLASSE}
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-13 text-ink-secondary mb-1 block" htmlFor="date">
              Date
            </label>
            <input id="date" type="date" className={CHAMP_CLASSE} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-13 text-ink-secondary mb-1 block" htmlFor="libelle">
            Libellé
          </label>
          <input id="libelle" type="text" className={CHAMP_CLASSE} value={libelle} onChange={(e) => setLibelle(e.target.value)} />
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className="text-13 text-ink-secondary mb-1 block" htmlFor="categorie">
              Catégorie
            </label>
            <select id="categorie" className={CHAMP_CLASSE} value={categorieId ?? ''} onChange={(e) => setCategorieId(e.target.value || null)}>
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.libelle}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="text-13 text-ink-secondary mb-1 block" htmlFor="tiers">
              Tiers
            </label>
            <select id="tiers" className={CHAMP_CLASSE} value={tiersId ?? ''} onChange={(e) => setTiersId(e.target.value || null)}>
              <option value="">—</option>
              {tiers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nom}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <p className="text-13 text-ink-secondary mb-1">Mode de règlement</p>
          <Segmente options={MODE_REGLEMENT_OPTIONS} value={modeReglement} onChange={setModeReglement} />
        </div>

        {sens === 'depense' && (
          <div>
            <p className="text-13 text-ink-secondary mb-1">Nature</p>
            <Segmente options={NATURE_OPTIONS_DEPENSE} value={nature} onChange={setNature} />
          </div>
        )}

        {natureEffective === 'investissement_amortissable' && (
          <div className="max-w-[200px]">
            <label className="text-13 text-ink-secondary mb-1 block" htmlFor="duree">
              Durée d'amortissement (années)
            </label>
            <input
              id="duree"
              type="number"
              min="1"
              className={CHAMP_CLASSE}
              value={dureeAmortissement}
              onChange={(e) => setDureeAmortissement(e.target.value)}
            />
          </div>
        )}

        <div className="border-t border-rule pt-3 flex flex-col gap-3">
          <div className="flex gap-4 flex-wrap items-end">
            <div>
              <p className="text-13 text-ink-secondary mb-1">Niveau d'affectation</p>
              <Segmente options={NIVEAU_OPTIONS} value={niveauAffectation} onChange={setNiveauAffectation} />
            </div>
            <div>
              <p className="text-13 text-ink-secondary mb-1">Clé de répartition</p>
              <Segmente options={CLE_OPTIONS} value={cleRepartition} onChange={setCleRepartition} />
            </div>
          </div>

          {niveauAffectation === 'rucher' && (
            <div className="max-w-[260px]">
              <label className="text-13 text-ink-secondary mb-1 block" htmlFor="rucher">
                Rucher
              </label>
              <select id="rucher" className={CHAMP_CLASSE} value={rucherId ?? ''} onChange={(e) => setRucherId(e.target.value || null)}>
                <option value="">—</option>
                {ruchers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nom}
                  </option>
                ))}
              </select>
            </div>
          )}

          {niveauAffectation === 'ruches' && (
            <div className="flex flex-col gap-2">
              {ruchers.map((rucher) => (
                <div key={rucher.id}>
                  <p className="text-11 font-mono uppercase text-ink-secondary">{rucher.nom}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {toutesLesRuches
                      .filter((r) => r.rucher_id === rucher.id)
                      .map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => basculerSelectionRuche(r.id)}
                          className={`h-11 min-w-11 px-3 rounded border text-13 font-bold ${
                            rucheIdsSelection.includes(r.id)
                              ? 'bg-ink text-surface border-ink'
                              : 'bg-surface text-ink border-rule-strong'
                          }`}
                        >
                          Ruche {r.numero}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {cleRepartition === 'manuelle' && populationRuches.length > 0 && (
            <div className="flex flex-col gap-2">
              {populationRuches.map((r) => (
                <div key={r.id} className="flex items-center gap-2">
                  <span className="text-13 flex-1">Ruche {r.numero} (%)</span>
                  <input
                    type="number"
                    className="w-24 h-10 text-15 border border-rule-strong rounded px-2 bg-surface text-ink"
                    value={pourcentages[r.id] ?? ''}
                    onChange={(e) => setPourcentages({ ...pourcentages, [r.id]: e.target.value })}
                  />
                </div>
              ))}
              <p className={`text-11 ${Math.round(sommePourcentages) === 100 ? 'text-ink-secondary' : 'text-urgent-ink'}`}>
                Total : {sommePourcentages} % (doit faire 100 %)
              </p>
            </div>
          )}

          {/* Éclatement visible avant validation (cadrage UX L4 §3.4). */}
          <div className="bg-surface-sunk rounded p-3">
            <p className="text-11 font-mono uppercase text-ink-secondary mb-2">
              Affectation {previewEnCours ? '(calcul…)' : `— ${previewLignes.length} ruche(s)`}
            </p>
            {previewLignes.length === 0 ? (
              <p className="text-13 text-ink-secondary">
                Non affecté {populationRuches.length === 0 ? '(aucune ruche sélectionnée)' : '(production nulle)'}
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {previewLignes.map((l) => (
                  <div key={l.ruche_id} className="flex justify-between text-13 font-mono">
                    <span>Ruche {l.numero}</span>
                    <span>{l.montant_calcule.toFixed(2)} €</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-rule pt-3">
          <label className="inline-block h-11 px-3 rounded bg-surface border border-rule-strong text-ink text-13 font-bold leading-[42px] cursor-pointer">
            {compressionEnCours ? 'Compression…' : photo ? 'Remplacer le justificatif' : '+ Photographier un justificatif'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              disabled={compressionEnCours}
              onChange={(e) => {
                if (e.target.files.length > 0) ajouterPhoto(e.target.files[0]);
                e.target.value = '';
              }}
            />
          </label>
          {photo && (
            <div className="mt-2 flex items-center gap-2">
              <img src={photo.url} alt="Justificatif" className="h-16 w-16 object-cover rounded border border-rule" />
              <button type="button" onClick={retirerPhoto} className="text-13 text-urgent-ink underline">
                Retirer
              </button>
            </div>
          )}
        </div>

        {message && <p className="text-13 text-center text-ink-secondary">{message}</p>}

        <button type="button" onClick={enregistrer} className="h-[46px] w-full rounded bg-ink text-surface text-15 font-bold">
          Enregistrer
        </button>
      </div>
    </div>
  );
}
