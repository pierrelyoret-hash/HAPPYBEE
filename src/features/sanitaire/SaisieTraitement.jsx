import { useEffect, useMemo, useState } from 'react';
import { Compteur } from '../../components/Compteur.jsx';
import { Segmente } from '../../components/Segmente.jsx';
import { Interrupteur } from '../../components/Interrupteur.jsx';
import { EnTeteEcran } from '../../components/EnTeteEcran.jsx';
import { db } from '../../db/db.js';
import { enregistrerTraitement } from '../../db/repositories/sanitaire.js';
import { creerTache } from '../../db/repositories/taches.js';

const VOIE_OPTIONS = [
  { value: 'laniere', label: 'Lanière' },
  { value: 'sublimation', label: 'Sublimation' },
  { value: 'degouttement', label: 'Dégouttement' },
  { value: 'autre', label: 'Autre' },
];

const CHAMP_CLASSE =
  'w-full h-11 text-15 border border-rule-strong rounded px-2 bg-surface text-ink';

function dateDuJour() {
  return new Date().toISOString().slice(0, 10);
}

// Pas de champ obligatoire (brief L2.2 §3, cohérent avec le reste de
// l'application). Aucun report d'une saisie à l'autre : contrairement à la
// visite, un traitement n'a pas de "précédent" dont hériter des valeurs.
export function SaisieTraitement({ colonieId, onRetour, onEnregistre }) {
  const [ruche, setRuche] = useState(null);
  const [dateDebut, setDateDebut] = useState(dateDuJour());
  const [dateFin, setDateFin] = useState(dateDuJour());
  const [produit, setProduit] = useState('');
  const [numeroAmm, setNumeroAmm] = useState('');
  const [numeroLot, setNumeroLot] = useState('');
  const [dosage, setDosage] = useState('');
  const [voie, setVoie] = useState(null);
  const [motif, setMotif] = useState('');
  const [delaiAttenteJours, setDelaiAttenteJours] = useState(0);
  const [conformeBio, setConformeBio] = useState(null);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!colonieId) return;
    db.colonie.get(colonieId).then((colonie) => {
      if (!colonie) return;
      db.ruche.get(colonie.ruche_id).then((r) => setRuche(r ?? null));
    });
  }, [colonieId]);

  // Calculée = date_fin + delai_attente_jours (brief §3). Se recalcule à
  // chaque changement de l'un ou l'autre champ.
  const dateFinDelaiAttente = useMemo(() => {
    if (!dateFin) return null;
    const d = new Date(dateFin);
    d.setDate(d.getDate() + (delaiAttenteJours || 0));
    return d.toISOString().slice(0, 10);
  }, [dateFin, delaiAttenteJours]);

  // Rappel fixe (brief §2 point 6, cahier des charges §6.3) : uniquement si
  // un délai d'attente réel est déclaré — sans délai, rien à attendre.
  async function creerRappelSiNecessaire(traitement) {
    if (!traitement.delai_attente_jours || traitement.delai_attente_jours <= 0) return;
    if (!traitement.date_fin_delai_attente) return;
    const maintenant = new Date().toISOString();
    await creerTache({
      id: crypto.randomUUID(),
      colonie_id: traitement.colonie_id,
      rucher_id: ruche?.rucher_id ?? null,
      // Pas de "— Ruche X" ici : le bloc "à faire en premier" (VueEnsemble)
      // préfixe déjà le libellé avec le numéro de ruche.
      libelle: 'Récolte à nouveau autorisée',
      date_echeance: new Date(traitement.date_fin_delai_attente).toISOString(),
      priorite: 'moyenne',
      origine: 'generee',
      regle_origine: 'traitement_delai_attente',
      statut: 'a_faire',
      visite_declencheuse_id: null,
      created_at: maintenant,
      updated_at: maintenant,
      deleted_at: null,
    });
  }

  async function enregistrer() {
    if (!colonieId) return;
    try {
      const maintenant = new Date().toISOString();
      const traitement = {
        id: crypto.randomUUID(),
        colonie_id: colonieId,
        date_debut: dateDebut || null,
        date_fin: dateFin || null,
        produit: produit || null,
        numero_amm: numeroAmm || null,
        numero_lot: numeroLot || null,
        dosage: dosage || null,
        voie,
        motif: motif || null,
        delai_attente_jours: delaiAttenteJours,
        date_fin_delai_attente: dateFinDelaiAttente,
        // Rattachement de document non construit dans cette passe (pas de
        // stockage de fichier existant dans l'application) — le champ reste
        // prêt, à cadrer séparément.
        ordonnance_document_id: null,
        conforme_bio: conformeBio,
        notes: notes || null,
        created_at: maintenant,
        updated_at: maintenant,
        deleted_at: null,
      };
      await enregistrerTraitement(traitement);
      await creerRappelSiNecessaire(traitement);
      setMessage('Traitement enregistré.');
      onEnregistre?.(colonieId);
    } catch (err) {
      console.error('[sanitaire] échec enregistrement traitement', err);
      setMessage("Erreur : le traitement n'a pas pu être enregistré.");
    }
  }

  return (
    <div className="min-h-screen bg-ground text-ink flex flex-col max-w-md mx-auto">
      <EnTeteEcran retourLibelle="← Retour" onRetour={onRetour} titre="Traitement" />

      <div className="p-4 flex flex-col gap-4">

      <section className="flex flex-col gap-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-13 text-ink-secondary mb-1 block" htmlFor="date_debut">
              Début
            </label>
            <input
              id="date_debut"
              type="date"
              className={CHAMP_CLASSE}
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="text-13 text-ink-secondary mb-1 block" htmlFor="date_fin">
              Fin
            </label>
            <input
              id="date_fin"
              type="date"
              className={CHAMP_CLASSE}
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-13 text-ink-secondary mb-1 block" htmlFor="produit">
            Produit
          </label>
          <input
            id="produit"
            type="text"
            className={CHAMP_CLASSE}
            value={produit}
            onChange={(e) => setProduit(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-13 text-ink-secondary mb-1 block" htmlFor="numero_amm">
              N° AMM
            </label>
            <input
              id="numero_amm"
              type="text"
              className={CHAMP_CLASSE}
              value={numeroAmm}
              onChange={(e) => setNumeroAmm(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="text-13 text-ink-secondary mb-1 block" htmlFor="numero_lot">
              N° de lot
            </label>
            <input
              id="numero_lot"
              type="text"
              className={CHAMP_CLASSE}
              value={numeroLot}
              onChange={(e) => setNumeroLot(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-13 text-ink-secondary mb-1 block" htmlFor="dosage">
            Dosage
          </label>
          <input
            id="dosage"
            type="text"
            className={CHAMP_CLASSE}
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
          />
        </div>

        <div>
          <p className="text-13 text-ink-secondary mb-1">Voie</p>
          <Segmente options={VOIE_OPTIONS} value={voie} onChange={setVoie} />
        </div>

        <div>
          <label className="text-13 text-ink-secondary mb-1 block" htmlFor="motif">
            Motif
          </label>
          <input
            id="motif"
            type="text"
            className={CHAMP_CLASSE}
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
          />
        </div>

        <Compteur
          label="Délai d'attente (jours)"
          value={delaiAttenteJours}
          max={60}
          onChange={setDelaiAttenteJours}
        />
        {delaiAttenteJours > 0 && dateFinDelaiAttente && (
          <p className="text-12 text-ink-muted -mt-2">
            Fin de délai : {new Date(dateFinDelaiAttente).toLocaleDateString('fr-FR')}
          </p>
        )}

        <Interrupteur
          label="Conforme bio"
          value={conformeBio}
          provenance={conformeBio == null ? 'vide' : 'saisi'}
          onChange={setConformeBio}
        />

        <div>
          <label className="text-13 text-ink-secondary mb-1 block" htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            className="w-full border border-rule-strong rounded p-2 text-15 bg-surface text-ink"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </section>

      {message && <p className="text-13 text-center text-ink-secondary">{message}</p>}

      <button
        type="button"
        onClick={enregistrer}
        className="h-[46px] w-full rounded bg-ink text-surface text-15 font-bold"
      >
        Enregistrer
      </button>

      {onRetour && (
        <button
          type="button"
          onClick={onRetour}
          className="h-12 w-full text-13 text-ink-secondary underline"
        >
          Retour
        </button>
      )}
      </div>
    </div>
  );
}
