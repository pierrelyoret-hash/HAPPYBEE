import { useEffect, useMemo, useState } from 'react';
import { Segmente } from '../../components/Segmente.jsx';
import { SelecteurUnique } from '../../components/SelecteurUnique.jsx';
import { Chips } from '../../components/Chips.jsx';
import { BoutonRetour } from '../../components/BoutonRetour.jsx';
import { db } from '../../db/db.js';
import { listerColoniesActives } from '../../db/repositories/colonies.js';
import {
  calculerPoidsNet,
  enregistrerRecolte,
  enregistrerRecoltePeseeGlobale,
  listerTraitementsEnDelaiAttente,
  POIDS_MOYEN_CADRE_DEFAUT_KG,
} from '../../db/repositories/recolte.js';
import { PRODUIT_LIBELLES, MODE_SAISIE_LIBELLES } from '../../lib/libellesRecolte.js';

const PRODUIT_OPTIONS = Object.entries(PRODUIT_LIBELLES).map(([value, label]) => ({ value, label }));
const MODE_OPTIONS = Object.entries(MODE_SAISIE_LIBELLES).map(([value, label]) => ({ value, label }));
const REPARTITION_OPTIONS = [
  { value: 'egale', label: 'Égale' },
  { value: 'manuelle', label: 'Manuelle' },
];

const CHAMP_CLASSE =
  'w-full h-11 text-15 border border-rule-strong rounded px-2 bg-surface text-ink';

function dateDuJour() {
  return new Date().toISOString().slice(0, 10);
}

function dateLisible(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('fr-FR');
}

// Écran de saisie récolte (lot L3, F4.1) — six modes au choix, poids net
// calculé automatiquement (§6.1). Pas de champ obligatoire.
export function SaisieRecolte({ colonieId, onRetour, onEnregistre }) {
  const [ruche, setRuche] = useState(null);
  const [date, setDate] = useState(dateDuJour());
  const [produit, setProduit] = useState(null);
  const [modeSaisie, setModeSaisie] = useState(null);
  const [poidsBrut, setPoidsBrut] = useState('');
  const [tareHausse, setTareHausse] = useState('');
  const [nbHausses, setNbHausses] = useState('');
  const [nbCadres, setNbCadres] = useState('');
  const [poidsMoyenCadre, setPoidsMoyenCadre] = useState(String(POIDS_MOYEN_CADRE_DEFAUT_KG));
  const [capaciteHausseKg, setCapaciteHausseKg] = useState('');
  const [ratioRemplissagePct, setRatioRemplissagePct] = useState('');
  const [peseesHausses, setPeseesHausses] = useState(['']);
  const [typeMiellee, setTypeMiellee] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState(null);
  const [alerteDelaiAttente, setAlerteDelaiAttente] = useState([]);
  const [confirmerMalgreDelai, setConfirmerMalgreDelai] = useState(false);

  // Pesée globale répartie : liste des colonies du rucher + clé de répartition.
  const [coloniesRucher, setColoniesRucher] = useState([]);
  const [coloniesChoisies, setColoniesChoisies] = useState([]);
  const [cleRepartition, setCleRepartition] = useState('egale');
  const [pourcentages, setPourcentages] = useState({});

  useEffect(() => {
    if (!colonieId) return;
    async function charger() {
      const colonie = await db.colonie.get(colonieId);
      const r = colonie ? await db.ruche.get(colonie.ruche_id) : null;
      setRuche(r ?? null);
      if (r) {
        const toutes = await listerColoniesActives();
        setColoniesRucher(toutes.filter((c) => c.rucher.id === r.rucher_id));
      }
    }
    charger();
  }, [colonieId]);

  // F3.2 : le blocage porte sur la date de la récolte, pas sur "aujourd'hui"
  // — une récolte saisie a posteriori doit être jugée par rapport à sa
  // propre date. Recalculé à chaque changement de date ou de colonie(s) ;
  // toute nouvelle alerte réarme la confirmation d'un éventuel passage
  // outre. En pesée globale répartie, toutes les colonies concernées sont
  // vérifiées, pas seulement celle d'entrée sur l'écran.
  useEffect(() => {
    const colonieIds =
      modeSaisie === 'pesee_globale_repartie'
        ? coloniesChoisies
        : colonieId
          ? [colonieId]
          : [];
    if (colonieIds.length === 0) {
      setAlerteDelaiAttente([]);
      return;
    }
    Promise.all(colonieIds.map((id) => listerTraitementsEnDelaiAttente(id, date || dateDuJour()))).then(
      (listes) => {
        setAlerteDelaiAttente(listes.flat());
        setConfirmerMalgreDelai(false);
      }
    );
  }, [colonieId, date, modeSaisie, coloniesChoisies]);

  const poidsNetAperçu = useMemo(
    () =>
      calculerPoidsNet({
        mode_saisie: modeSaisie,
        poids_brut: poidsBrut !== '' ? Number(poidsBrut) : null,
        tare_hausse: tareHausse !== '' ? Number(tareHausse) : null,
        nb_hausses: nbHausses !== '' ? Number(nbHausses) : null,
        nb_cadres: nbCadres !== '' ? Number(nbCadres) : null,
        poids_moyen_cadre: poidsMoyenCadre !== '' ? Number(poidsMoyenCadre) : null,
        capacite_hausse_kg: capaciteHausseKg !== '' ? Number(capaciteHausseKg) : null,
        ratio_remplissage_pct: ratioRemplissagePct !== '' ? Number(ratioRemplissagePct) : null,
        pesees_hausses: peseesHausses,
      }),
    [
      modeSaisie,
      poidsBrut,
      tareHausse,
      nbHausses,
      nbCadres,
      poidsMoyenCadre,
      capaciteHausseKg,
      ratioRemplissagePct,
      peseesHausses,
    ]
  );

  const sommePourcentages = coloniesChoisies.reduce(
    (s, id) => s + (Number(pourcentages[id]) || 0),
    0
  );

  function basculerColonieChoisie(id) {
    setColoniesChoisies((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  }

  async function enregistrer() {
    if (!colonieId && modeSaisie !== 'pesee_globale_repartie') return;
    // F3.2 : bloque l'enregistrement pendant un délai d'attente actif, sauf
    // passage outre explicite (ex. récolte d'une hausse non traitée du même
    // rucher — situation réelle non exclue par le cahier des charges).
    if (alerteDelaiAttente.length > 0 && !confirmerMalgreDelai) {
      setMessage("Délai d'attente en cours — confirmez pour enregistrer quand même.");
      return;
    }
    try {
      if (modeSaisie === 'pesee_globale_repartie') {
        if (coloniesChoisies.length === 0 || poidsBrut === '') {
          setMessage('Sélectionnez au moins une colonie et un poids total.');
          return;
        }
        const repartitions =
          cleRepartition === 'egale'
            ? coloniesChoisies.map((id) => ({ colonie_id: id, pct: 100 / coloniesChoisies.length }))
            : coloniesChoisies.map((id) => ({ colonie_id: id, pct: Number(pourcentages[id]) || 0 }));
        if (cleRepartition === 'manuelle' && Math.round(sommePourcentages) !== 100) {
          setMessage('La somme des pourcentages doit être égale à 100.');
          return;
        }
        await enregistrerRecoltePeseeGlobale({
          date,
          produit,
          poidsBrutTotal: Number(poidsBrut),
          typeMiellee,
          notes,
          repartitions,
        });
        setMessage('Récolte répartie enregistrée.');
        onEnregistre?.(colonieId);
        return;
      }

      const maintenant = new Date().toISOString();
      const recolte = {
        id: crypto.randomUUID(),
        colonie_id: colonieId,
        date: date || null,
        produit,
        mode_saisie: modeSaisie,
        poids_brut: poidsBrut !== '' ? Number(poidsBrut) : null,
        tare_hausse: tareHausse !== '' ? Number(tareHausse) : null,
        nb_hausses: nbHausses !== '' ? Number(nbHausses) : null,
        nb_cadres: nbCadres !== '' ? Number(nbCadres) : null,
        ratio_remplissage_pct: ratioRemplissagePct !== '' ? Number(ratioRemplissagePct) : null,
        poids_net: poidsNetAperçu,
        type_miellee: typeMiellee || null,
        notes:
          notes ||
          (modeSaisie === 'pesee_hausse_par_hausse'
            ? `Pesées : ${peseesHausses.filter((p) => p !== '').join(' + ')} kg`
            : null),
        created_at: maintenant,
        updated_at: maintenant,
        deleted_at: null,
      };
      await enregistrerRecolte(recolte);
      setMessage('Récolte enregistrée.');
      onEnregistre?.(colonieId);
    } catch (err) {
      console.error('[recolte] échec enregistrement', err);
      setMessage("Erreur : la récolte n'a pas pu être enregistrée.");
    }
  }

  return (
    <div className="min-h-screen bg-ground text-ink p-4 flex flex-col gap-4 max-w-md mx-auto">
      <header className="flex flex-col gap-1">
        <BoutonRetour onRetour={onRetour} />
        <h1 className="text-20 font-bold">
          {ruche ? `Ruche ${ruche.numero}` : 'Colonie'} — Récolte
        </h1>
      </header>

      {alerteDelaiAttente.length > 0 && (
        <div className="border border-rule-strong bg-urgent-bg rounded p-3 flex flex-col gap-2">
          <div>
            <p className="text-13 font-bold text-urgent-ink">
              Délai d'attente en cours sur cette colonie
            </p>
            {alerteDelaiAttente.map((t) => (
              <p key={t.id} className="text-11 text-urgent-ink">
                {t.produit ?? 'Traitement'} — récolte à nouveau autorisée le{' '}
                {dateLisible(t.date_fin_delai_attente)}
              </p>
            ))}
          </div>
          <label className="flex items-center gap-2 text-12 text-urgent-ink">
            <input
              type="checkbox"
              checked={confirmerMalgreDelai}
              onChange={(e) => setConfirmerMalgreDelai(e.target.checked)}
            />
            Enregistrer quand même
          </label>
        </div>
      )}

      <section className="flex flex-col gap-3">
        <div>
          <label className="text-13 text-ink-secondary mb-1 block" htmlFor="date">
            Date
          </label>
          <input
            id="date"
            type="date"
            className={CHAMP_CLASSE}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div>
          <p className="text-13 text-ink-secondary mb-1">Produit</p>
          <Segmente options={PRODUIT_OPTIONS} value={produit} onChange={setProduit} />
        </div>

        <div>
          <p className="text-13 text-ink-secondary mb-1">Mode de saisie</p>
          <SelecteurUnique options={MODE_OPTIONS} value={modeSaisie} onChange={setModeSaisie} />
        </div>

        {modeSaisie === 'poids_simple' && (
          <div>
            <label className="text-13 text-ink-secondary mb-1 block" htmlFor="poids_brut">
              Poids (kg)
            </label>
            <input
              id="poids_brut"
              type="number"
              step="0.1"
              className={CHAMP_CLASSE}
              value={poidsBrut}
              onChange={(e) => setPoidsBrut(e.target.value)}
            />
          </div>
        )}

        {modeSaisie === 'poids_avec_tare' && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-13 text-ink-secondary mb-1 block" htmlFor="poids_brut">
                Poids brut (kg)
              </label>
              <input
                id="poids_brut"
                type="number"
                step="0.1"
                className={CHAMP_CLASSE}
                value={poidsBrut}
                onChange={(e) => setPoidsBrut(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-13 text-ink-secondary mb-1 block" htmlFor="tare_hausse">
                  Tare par hausse (kg)
                </label>
                <input
                  id="tare_hausse"
                  type="number"
                  step="0.1"
                  className={CHAMP_CLASSE}
                  value={tareHausse}
                  onChange={(e) => setTareHausse(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="text-13 text-ink-secondary mb-1 block" htmlFor="nb_hausses">
                  Nombre de hausses
                </label>
                <input
                  id="nb_hausses"
                  type="number"
                  className={CHAMP_CLASSE}
                  value={nbHausses}
                  onChange={(e) => setNbHausses(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {modeSaisie === 'nombre_cadres' && (
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-13 text-ink-secondary mb-1 block" htmlFor="nb_cadres">
                Nombre de cadres
              </label>
              <input
                id="nb_cadres"
                type="number"
                className={CHAMP_CLASSE}
                value={nbCadres}
                onChange={(e) => setNbCadres(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-13 text-ink-secondary mb-1 block" htmlFor="poids_moyen_cadre">
                Poids moyen/cadre (kg)
              </label>
              <input
                id="poids_moyen_cadre"
                type="number"
                step="0.1"
                className={CHAMP_CLASSE}
                value={poidsMoyenCadre}
                onChange={(e) => setPoidsMoyenCadre(e.target.value)}
              />
            </div>
          </div>
        )}

        {modeSaisie === 'ratio_remplissage' && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-13 text-ink-secondary mb-1 block" htmlFor="nb_hausses_r">
                  Nombre de hausses
                </label>
                <input
                  id="nb_hausses_r"
                  type="number"
                  className={CHAMP_CLASSE}
                  value={nbHausses}
                  onChange={(e) => setNbHausses(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="text-13 text-ink-secondary mb-1 block" htmlFor="capacite_hausse">
                  Capacité pleine/hausse (kg)
                </label>
                <input
                  id="capacite_hausse"
                  type="number"
                  step="0.1"
                  className={CHAMP_CLASSE}
                  value={capaciteHausseKg}
                  onChange={(e) => setCapaciteHausseKg(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-13 text-ink-secondary mb-1 block" htmlFor="ratio_pct">
                Taux de remplissage (%)
              </label>
              <input
                id="ratio_pct"
                type="number"
                className={CHAMP_CLASSE}
                value={ratioRemplissagePct}
                onChange={(e) => setRatioRemplissagePct(e.target.value)}
              />
            </div>
          </div>
        )}

        {modeSaisie === 'pesee_hausse_par_hausse' && (
          <div className="flex flex-col gap-2">
            <p className="text-13 text-ink-secondary">Pesée nette de chaque hausse (kg)</p>
            {peseesHausses.map((p, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="number"
                  step="0.1"
                  className={CHAMP_CLASSE}
                  value={p}
                  onChange={(e) => {
                    const copie = [...peseesHausses];
                    copie[i] = e.target.value;
                    setPeseesHausses(copie);
                  }}
                />
                {peseesHausses.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setPeseesHausses(peseesHausses.filter((_, j) => j !== i))}
                    className="text-13 text-ink-secondary underline shrink-0"
                  >
                    Retirer
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setPeseesHausses([...peseesHausses, ''])}
              className="text-13 text-ink-secondary underline self-start"
            >
              + Ajouter une hausse
            </button>
          </div>
        )}

        {modeSaisie === 'pesee_globale_repartie' && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-13 text-ink-secondary mb-1 block" htmlFor="poids_brut_global">
                Poids total (kg)
              </label>
              <input
                id="poids_brut_global"
                type="number"
                step="0.1"
                className={CHAMP_CLASSE}
                value={poidsBrut}
                onChange={(e) => setPoidsBrut(e.target.value)}
              />
            </div>
            <div>
              <p className="text-13 text-ink-secondary mb-1">Colonies concernées</p>
              <Chips
                options={coloniesRucher.map((c) => ({
                  value: c.colonie.id,
                  label: `Ruche ${c.ruche.numero}`,
                }))}
                value={coloniesChoisies}
                onChange={setColoniesChoisies}
              />
            </div>
            <div>
              <p className="text-13 text-ink-secondary mb-1">Clé de répartition</p>
              <Segmente
                options={REPARTITION_OPTIONS}
                value={cleRepartition}
                onChange={setCleRepartition}
              />
            </div>
            {cleRepartition === 'manuelle' && coloniesChoisies.length > 0 && (
              <div className="flex flex-col gap-2">
                {coloniesChoisies.map((id) => {
                  const c = coloniesRucher.find((c2) => c2.colonie.id === id);
                  return (
                    <div key={id} className="flex items-center gap-2">
                      <span className="text-13 flex-1">Ruche {c?.ruche.numero} (%)</span>
                      <input
                        type="number"
                        className="w-24 h-10 text-15 border border-rule-strong rounded px-2 bg-surface text-ink"
                        value={pourcentages[id] ?? ''}
                        onChange={(e) =>
                          setPourcentages({ ...pourcentages, [id]: e.target.value })
                        }
                      />
                    </div>
                  );
                })}
                <p
                  className={`text-11 ${
                    Math.round(sommePourcentages) === 100 ? 'text-ink-secondary' : 'text-urgent-ink'
                  }`}
                >
                  Total : {sommePourcentages} % (doit faire 100 %)
                </p>
              </div>
            )}
          </div>
        )}

        {modeSaisie && modeSaisie !== 'pesee_globale_repartie' && (
          <p className="text-13 text-ink-secondary">
            Poids net calculé : <span className="font-bold text-ink">{poidsNetAperçu ?? '—'} kg</span>
          </p>
        )}

        <div>
          <label className="text-13 text-ink-secondary mb-1 block" htmlFor="type_miellee">
            Type de miellée
          </label>
          <input
            id="type_miellee"
            type="text"
            placeholder="acacia, toutes fleurs…"
            className={CHAMP_CLASSE}
            value={typeMiellee}
            onChange={(e) => setTypeMiellee(e.target.value)}
          />
        </div>

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
  );
}
