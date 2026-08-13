import { useEffect, useState } from 'react';
import { Compteur } from '../../components/Compteur.jsx';
import { Segmente } from '../../components/Segmente.jsx';
import { Interrupteur } from '../../components/Interrupteur.jsx';
import { Chips } from '../../components/Chips.jsx';
import { BoutonRetour } from '../../components/BoutonRetour.jsx';
import { db } from '../../db/db.js';
import {
  enregistrerObservationCadre,
  listerObservationsVisite,
  recalculerAgregatsVisite,
} from '../../db/repositories/observationCadre.js';
import { SIGNES_SANITAIRES_OPTIONS } from '../../lib/taxonomieSanitaire.js';

// Addendum §A.7 : "un seul écran par face". Pas d'écran séparé de choix de
// mode (cadre remarquable / zone de couvain / complet, §A.7) — les trois
// modes sont une conséquence du nombre de faces qu'on choisit de saisir
// avant "Terminer", pas un état distinct à gérer : un seul écran rapide,
// "Face suivante" pour continuer, "Terminer" pour sortir à tout moment.
const TYPE_CADRE_OPTIONS = [
  { value: 'bati', label: 'Bâti' },
  { value: 'gaufre_neuf', label: 'Gaufré neuf' },
  { value: 'amorce', label: 'Amorce' },
  { value: 'naturel', label: 'Naturel' },
  { value: 'partition', label: 'Partition' },
  { value: 'nourrisseur', label: 'Nourrisseur' },
];

const FACE_OPTIONS = [
  { value: 'A', label: 'Face A' },
  { value: 'B', label: 'Face B' },
];

const HUITIEMES_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ value: n, label: String(n) }));

const PONTE_ECHELLE_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }));

const CELLULES_ROYALES_TYPE_OPTIONS = [
  { value: 'essaimage', label: 'Essaimage' },
  { value: 'supersedure', label: 'Supersédure' },
  { value: 'sauvete', label: 'Sauveté' },
];

const CELLULES_ROYALES_POS_OPTIONS = [
  { value: 'bord_inferieur', label: 'Bord inférieur' },
  { value: 'bord_lateral', label: 'Bord latéral' },
  { value: 'pleine_surface', label: 'Pleine surface' },
];

// Occupation des surfaces en huitièmes (§A.3) — réglette de neuf boutons
// par champ. L'état du cadre, les réserves détaillées et le test de
// l'allumette (§A.3, priorité S) restent hors de cette première passe :
// repliés par défaut dans l'esprit du brief, pas encore construits.
const CHAMPS_OCCUPATION = [
  ['couvain_opercule', 'Couvain operculé'],
  ['couvain_ouvert', 'Couvain ouvert'],
  ['oeufs', 'Œufs'],
  ['miel_opercule', 'Miel operculé'],
  ['nectar_frais', 'Nectar frais'],
  ['pollen', 'Pollen'],
  ['cellules_vides', 'Cellules vides'],
  ['non_bati', 'Non bâti'],
  ['couvain_male', 'Couvain de mâles'],
];

function etatInitialOccupation() {
  return Object.fromEntries(CHAMPS_OCCUPATION.map(([champ]) => [champ, null]));
}

export function ObservationCadre({ visiteId, colonieId, onTerminer }) {
  const [ruche, setRuche] = useState(null);
  const [nbEnregistrees, setNbEnregistrees] = useState(0);
  const [position, setPosition] = useState(1);
  const [face, setFace] = useState('A');
  const [typeCadre, setTypeCadre] = useState(null);
  const [occupation, setOccupation] = useState(etatInitialOccupation());
  const [scorePonte, setScorePonte] = useState(null);
  const [cellulesRoyalesNb, setCellulesRoyalesNb] = useState(0);
  const [cellulesRoyalesType, setCellulesRoyalesType] = useState(null);
  const [cellulesRoyalesPos, setCellulesRoyalesPos] = useState(null);
  const [cellulesOperculees, setCellulesOperculees] = useState(null);
  const [signes, setSignes] = useState([]);
  const [signesOuverts, setSignesOuverts] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!colonieId) return;
    db.colonie.get(colonieId).then((colonie) => {
      if (!colonie) return;
      db.ruche.get(colonie.ruche_id).then((r) => setRuche(r ?? null));
    });
  }, [colonieId]);

  useEffect(() => {
    if (!visiteId) return;
    listerObservationsVisite(visiteId).then((liste) => setNbEnregistrees(liste.length));
  }, [visiteId]);

  function modifierOccupation(champ, valeur) {
    setOccupation((o) => ({ ...o, [champ]: valeur }));
  }

  const valeursSaisies = CHAMPS_OCCUPATION.map(([champ]) => occupation[champ]).filter(
    (v) => v != null
  );
  const somme = valeursSaisies.reduce((total, v) => total + v, 0);
  // Contrôle de cohérence (§A.3) : signale sans bloquer, seulement si au
  // moins une valeur a été saisie — une face vide n'a rien à contrôler.
  const ecartSignale = valeursSaisies.length > 0 && Math.abs(somme - 8) > 2;

  function reinitialiserFormulaire(nouvellePosition, nouvelleFace) {
    setPosition(nouvellePosition);
    setFace(nouvelleFace);
    setTypeCadre(null);
    setOccupation(etatInitialOccupation());
    setScorePonte(null);
    setCellulesRoyalesNb(0);
    setCellulesRoyalesType(null);
    setCellulesRoyalesPos(null);
    setCellulesOperculees(null);
    setSignes([]);
    setSignesOuverts(false);
    setMessage(null);
  }

  async function enregistrer() {
    if (!visiteId) return;
    try {
      const maintenant = new Date().toISOString();
      await enregistrerObservationCadre({
        id: crypto.randomUUID(),
        visite_id: visiteId,
        position,
        face,
        type_cadre: typeCadre,
        ...occupation,
        score_ponte: scorePonte,
        homogeneite_stades: null,
        couvain_male_disperse: null,
        couvain_bombe: null,
        miel_qualite: null,
        pollen_diversite: null,
        pollen_ancien: null,
        annee_cire: null,
        etat_bati: null,
        a_reformer: null,
        motif_reforme: null,
        fil_apparent: null,
        ponts_de_cire: null,
        moisissure: null,
        cellules_royales_nb: cellulesRoyalesNb,
        cellules_royales_type: cellulesRoyalesNb > 0 ? cellulesRoyalesType : null,
        cellules_royales_pos: cellulesRoyalesNb > 0 ? cellulesRoyalesPos : null,
        cellules_operculees: cellulesRoyalesNb > 0 ? cellulesOperculees : null,
        signes,
        test_allumette: null,
        photo_id: null,
        created_at: maintenant,
        updated_at: maintenant,
        deleted_at: null,
      });
      await recalculerAgregatsVisite(visiteId);
      setNbEnregistrees((n) => n + 1);
      setMessage('Face enregistrée.');
    } catch (err) {
      console.error('[cadre par cadre] échec enregistrement', err);
      setMessage("Erreur : l'observation n'a pas pu être enregistrée.");
    }
  }

  // Balayage entre faces et cadres (§A.7) : A → B du même cadre, puis B →
  // A du cadre suivant. Position/face restent éditables directement pour
  // sauter librement.
  function allerSuivant() {
    if (face === 'A') {
      reinitialiserFormulaire(position, 'B');
    } else {
      reinitialiserFormulaire(position + 1, 'A');
    }
  }

  return (
    <div className="min-h-screen bg-ground text-ink p-4 flex flex-col gap-4 max-w-md mx-auto">
      <header className="flex flex-col gap-1">
        <BoutonRetour onRetour={onTerminer} />
        <h1 className="text-20 font-bold">
          {ruche ? `Ruche ${ruche.numero}` : 'Colonie'} — Cadre par cadre
        </h1>
        <p className="text-13 text-ink-secondary">
          {nbEnregistrees > 0
            ? `${nbEnregistrees} face(s) déjà enregistrée(s) pour cette visite.`
            : 'Un cadre remarquable suffit — pas besoin de tout saisir.'}
        </p>
      </header>

      <section className="flex gap-3 items-end">
        <div className="flex-1">
          <Compteur label="Position" value={position} min={1} max={20} onChange={setPosition} />
        </div>
        <div className="flex-1">
          <p className="text-13 text-ink-secondary mb-1">Face</p>
          <Segmente options={FACE_OPTIONS} value={face} onChange={setFace} />
        </div>
      </section>

      <div>
        <p className="text-13 text-ink-secondary mb-1">Type de cadre</p>
        <Segmente options={TYPE_CADRE_OPTIONS} value={typeCadre} onChange={setTypeCadre} />
      </div>

      <section className="border border-rule rounded p-3 flex flex-col gap-3">
        <p className="text-13 font-bold text-ink-secondary">Occupation de la face (huitièmes)</p>
        {CHAMPS_OCCUPATION.map(([champ, label]) => (
          <div key={champ}>
            <p className="text-13 text-ink-secondary mb-1">{label}</p>
            <Segmente
              options={HUITIEMES_OPTIONS}
              value={occupation[champ]}
              onChange={(v) => modifierOccupation(champ, v)}
            />
          </div>
        ))}
        {ecartSignale && (
          <p className="text-12 text-action-ink">
            Somme des huitièmes : {somme} — assez loin de 8, juste pour information.
          </p>
        )}
        <div>
          <p className="text-13 text-ink-secondary mb-1">Ponte</p>
          <Segmente options={PONTE_ECHELLE_OPTIONS} value={scorePonte} onChange={setScorePonte} />
        </div>
      </section>

      <section className="border border-rule rounded p-3 flex flex-col gap-3">
        <p className="text-13 font-bold text-ink-secondary">Cellules royales</p>
        <Compteur label="Nombre" value={cellulesRoyalesNb} max={30} onChange={setCellulesRoyalesNb} />
        {cellulesRoyalesNb > 0 && (
          <>
            <div>
              <p className="text-13 text-ink-secondary mb-1">Type</p>
              <Segmente
                options={CELLULES_ROYALES_TYPE_OPTIONS}
                value={cellulesRoyalesType}
                onChange={setCellulesRoyalesType}
              />
            </div>
            <div>
              <p className="text-13 text-ink-secondary mb-1">Position</p>
              <Segmente
                options={CELLULES_ROYALES_POS_OPTIONS}
                value={cellulesRoyalesPos}
                onChange={setCellulesRoyalesPos}
              />
            </div>
            <Interrupteur
              label="Operculées"
              value={cellulesOperculees}
              provenance={cellulesOperculees == null ? 'vide' : 'saisi'}
              onChange={setCellulesOperculees}
            />
          </>
        )}
      </section>

      <section>
        <button
          type="button"
          onClick={() => setSignesOuverts((v) => !v)}
          className="text-13 text-ink-secondary underline"
        >
          {signesOuverts ? '▾' : '▸'} Signes observés sur ce cadre
          {signes.length > 0 && ` (${signes.length})`}
        </button>
        {signesOuverts && (
          <div className="mt-2">
            <Chips options={SIGNES_SANITAIRES_OPTIONS} value={signes} onChange={setSignes} />
          </div>
        )}
      </section>

      {message && <p className="text-13 text-center text-ink-secondary">{message}</p>}

      <button
        type="button"
        onClick={enregistrer}
        className="h-[46px] w-full rounded bg-ink text-surface text-15 font-bold"
      >
        Enregistrer cette face
      </button>

      <button
        type="button"
        onClick={allerSuivant}
        className="h-10 w-full rounded bg-surface border border-rule-strong text-ink text-15 font-bold"
      >
        Face suivante
      </button>

      {onTerminer && (
        <button
          type="button"
          onClick={onTerminer}
          className="h-12 w-full text-13 text-ink-secondary underline"
        >
          Terminer
        </button>
      )}
    </div>
  );
}
