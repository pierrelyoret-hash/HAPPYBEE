import { useEffect, useMemo, useState } from 'react';
import { Compteur } from '../../components/Compteur.jsx';
import { Segmente } from '../../components/Segmente.jsx';
import { EnTeteEcran } from '../../components/EnTeteEcran.jsx';
import { db } from '../../db/db.js';
import { enregistrerComptageVarroa, calculerNiveauAlerte } from '../../db/repositories/sanitaire.js';
import { creerTache } from '../../db/repositories/taches.js';

const METHODE_OPTIONS = [
  { value: 'lange_graisse', label: 'Lange graissé' },
  { value: 'sucre_glace', label: 'Sucre glace' },
  { value: 'lavage_alcool', label: 'Lavage alcool' },
  { value: 'comptage_naturel', label: 'Comptage naturel' },
];

const NIVEAU_ALERTE_LIBELLES = { faible: 'faible', modere: 'modéré', fort: 'fort' };

function dateDuJour() {
  return new Date().toISOString().slice(0, 10);
}

// Pas de champ obligatoire (brief L2.2 §3). niveau_alerte reste vide hors
// des deux fenêtres saisonnières chiffrées (avril-mai, juin-juillet) —
// aucun seuil par défaut n'est inventé (§3 F3.4).
function ajouterJours(dateIso, n) {
  const d = new Date(dateIso);
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

export function SaisieComptageVarroa({ colonieId, onRetour, onEnregistre }) {
  const [ruche, setRuche] = useState(null);
  const [date, setDate] = useState(dateDuJour());
  const [methode, setMethode] = useState(null);
  const [dureeJours, setDureeJours] = useState(1);
  const [nbVarroas, setNbVarroas] = useState(0);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!colonieId) return;
    db.colonie.get(colonieId).then((colonie) => {
      if (!colonie) return;
      db.ruche.get(colonie.ruche_id).then((r) => setRuche(r ?? null));
    });
  }, [colonieId]);

  const varroasParJour = useMemo(() => {
    if (!dureeJours) return null;
    return nbVarroas / dureeJours;
  }, [nbVarroas, dureeJours]);

  const niveauAlerte = useMemo(
    () => calculerNiveauAlerte(date, varroasParJour),
    [date, varroasParJour]
  );

  // Rappels fixes (brief §2 point 6, cahier des charges §6.3) — uniquement
  // sur les niveaux fort et modéré ; faible et non déterminé ne génèrent rien.
  async function creerRappelsSiNecessaire(comptage) {
    if (!comptage.niveau_alerte || !comptage.date) return;
    const maintenant = new Date().toISOString();
    const rucherId = ruche?.rucher_id ?? null;

    // Pas de "— Ruche X" dans le libellé : le bloc "à faire en premier"
    // (VueEnsemble) préfixe déjà avec le numéro de ruche.
    async function creer(libelle, joursDelai, priorite) {
      await creerTache({
        id: crypto.randomUUID(),
        colonie_id: comptage.colonie_id,
        rucher_id: rucherId,
        libelle,
        date_echeance: ajouterJours(comptage.date, joursDelai),
        priorite,
        origine: 'generee',
        regle_origine: `varroa_${comptage.niveau_alerte}`,
        statut: 'a_faire',
        visite_declencheuse_id: null,
        created_at: maintenant,
        updated_at: maintenant,
        deleted_at: null,
      });
    }

    if (comptage.niveau_alerte === 'fort') {
      await creer('Intervenir (varroa)', 2, 'urgente');
      await creer('Recompter (varroa)', 21, 'moyenne');
    } else if (comptage.niveau_alerte === 'modere') {
      await creer('Recompter (varroa)', 14, 'moyenne');
    }
  }

  async function enregistrer() {
    if (!colonieId) return;
    try {
      const maintenant = new Date().toISOString();
      const comptage = {
        id: crypto.randomUUID(),
        colonie_id: colonieId,
        date: date || null,
        methode,
        duree_jours: dureeJours || null,
        nb_varroas: nbVarroas,
        varroas_par_jour: varroasParJour,
        niveau_alerte: niveauAlerte,
        created_at: maintenant,
        updated_at: maintenant,
        deleted_at: null,
      };
      await enregistrerComptageVarroa(comptage);
      await creerRappelsSiNecessaire(comptage);
      setMessage('Comptage enregistré.');
      onEnregistre?.(colonieId);
    } catch (err) {
      console.error('[sanitaire] échec enregistrement comptage varroa', err);
      setMessage("Erreur : le comptage n'a pas pu être enregistré.");
    }
  }

  return (
    <div className="min-h-screen bg-ground text-ink flex flex-col max-w-md mx-auto">
      <EnTeteEcran retourLibelle="← Retour" onRetour={onRetour} titre="Comptage varroa" />

      <div className="p-4 flex flex-col gap-4">

      <section className="flex flex-col gap-3">
        <div>
          <label className="text-13 text-ink-secondary mb-1 block" htmlFor="date">
            Date
          </label>
          <input
            id="date"
            type="date"
            className="w-full h-11 text-15 border border-rule-strong rounded px-2 bg-surface text-ink"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div>
          <p className="text-13 text-ink-secondary mb-1">Méthode</p>
          <Segmente options={METHODE_OPTIONS} value={methode} onChange={setMethode} />
        </div>

        <Compteur label="Durée (jours)" value={dureeJours} min={1} max={14} onChange={setDureeJours} />
        <Compteur label="Varroas comptés" value={nbVarroas} max={300} onChange={setNbVarroas} />

        <div className="border border-rule rounded p-3 flex flex-col gap-1">
          <p className="text-13 text-ink-secondary">
            Varroas/jour :{' '}
            <span className="font-mono text-ink">
              {varroasParJour != null ? varroasParJour.toFixed(2) : '—'}
            </span>
          </p>
          <p className="text-13 text-ink-secondary">
            Niveau d'alerte :{' '}
            <span
              className={`font-bold ${
                niveauAlerte === 'fort'
                  ? 'text-urgent-ink'
                  : niveauAlerte === 'modere'
                    ? 'text-action-ink'
                    : 'text-ink'
              }`}
            >
              {niveauAlerte ? NIVEAU_ALERTE_LIBELLES[niveauAlerte] : 'non déterminé'}
            </span>
          </p>
          {!niveauAlerte && (
            <p className="text-11 text-ink-muted">
              Aucun seuil par défaut hors avril-mai et juin-juillet.
            </p>
          )}
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
