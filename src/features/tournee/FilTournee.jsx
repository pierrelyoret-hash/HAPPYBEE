import { useEffect, useRef, useState } from 'react';
import { EnTeteEcran } from '../../components/EnTeteEcran.jsx';
import { PastilleEtat } from '../../components/PastilleEtat.jsx';
import { db } from '../../db/db.js';
import { obtenirRucher } from '../../db/repositories/ruchers.js';
import { obtenirDerniereVisite } from '../../db/repositories/visites.js';
import { listerTachesOuvertesRucher } from '../../db/repositories/taches.js';
import { calculerEtat, joursDepuis } from '../../lib/etats.js';

function dateCourte(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function heureCourte(iso) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function metrique(valeur) {
  return valeur == null ? '—' : String(valeur);
}

function anciennete(jours) {
  if (jours == null) return 'jamais visitée';
  if (jours === 0) return "vue aujourd'hui";
  return `vue il y a ${jours} j`;
}

const SEUIL_GLISSEMENT = 72;
const GLISSEMENT_MAX = 120;

// Ligne "à venir" — la ligne entière reste cliquable comme partout ailleurs
// dans l'application (brief refonte §6 règle 9), et en plus balayable vers
// la droite. Décision de Pierre du 15/08/2026 : contrairement à la maquette
// d'origine, ce balayage ouvre l'écran de saisie normal — il n'enregistre
// pas de visite "rien à signaler" en un geste, aucun nouveau comportement de
// données n'est créé par ce lot.
function LigneAVenir({ ligne, onOuvrir }) {
  const [decalage, setDecalage] = useState(0);
  const glissement = useRef(null);

  function debuter(e) {
    glissement.current = { depart: e.clientX };
  }
  function glisser(e) {
    if (!glissement.current) return;
    setDecalage(Math.max(0, Math.min(GLISSEMENT_MAX, e.clientX - glissement.current.depart)));
  }
  function terminer() {
    if (!glissement.current) return;
    if (decalage > SEUIL_GLISSEMENT) onOuvrir();
    setDecalage(0);
    glissement.current = null;
  }

  return (
    <button
      type="button"
      onClick={onOuvrir}
      onPointerDown={debuter}
      onPointerMove={glisser}
      onPointerUp={terminer}
      onPointerLeave={terminer}
      style={{ touchAction: 'pan-y' }}
      className="flex-1 pb-3.5 relative text-left"
    >
      <span className="absolute inset-0 bottom-3.5 rounded bg-vert flex items-center pl-3 text-13 font-bold text-surface">
        → Ouvrir la saisie
      </span>
      <span
        className="relative block bg-surface border border-rule rounded p-2.5 transition-transform duration-150 ease-out"
        style={{ transform: `translateX(${decalage}px)` }}
      >
        <span className="text-13 font-bold text-ink">Ruche {ligne.ruche.numero}</span>
        <span className="block font-mono text-12 text-ink-secondary">
          {metrique(ligne.couvain)} couvain · {metrique(ligne.provisions)} provis.
        </span>
      </span>
    </button>
  );
}

// Fil de tournée (refonte visuelle, DESIGN/design_handoff_happybee_refonte/README.md
// §7) — vue plein écran qui déroule les colonies dans l'ordre de tournée.
// Aucun état nouveau côté données : "visitée" se déduit de la date de la
// dernière visite (aujourd'hui ou non), "passée" est un choix d'affichage
// local à cet écran, jamais persisté.
export function FilTournee({ rucherId, onRetour, onOuvrirVisite }) {
  const [rucher, setRucher] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [passees, setPassees] = useState(new Set());

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

        const derniereVisite = await obtenirDerniereVisite(colonie.id);
        const joursDepuisVisite = derniereVisite ? joursDepuis(derniereVisite.date) : null;
        const tachesColonie = tachesOuvertes.filter(
          (t) => t.colonie_id === colonie.id || (t.colonie_id == null && t.rucher_id === r.id)
        );
        const etat = calculerEtat({ tachesOuvertes: tachesColonie, joursDepuisVisite });

        return {
          ruche,
          colonie,
          etat,
          joursDepuisVisite,
          derniereVisite,
          visiteeAujourdhui: joursDepuisVisite === 0,
          couvain: derniereVisite?.nb_cadres_couvain_opercule ?? null,
          provisions: derniereVisite?.nb_cadres_provisions ?? null,
          note: etat === 'urgent' || etat === 'action' ? derniereVisite?.observation_libre : null,
        };
      })
    );
    setLignes(donnees.filter(Boolean));
    setChargement(false);
  }

  useEffect(() => {
    charger();
  }, [rucherId]);

  if (chargement) return null;

  if (!rucher) {
    return <p className="p-4 text-13 text-ink-secondary">Aucun rucher trouvé.</p>;
  }

  const faites = lignes.filter((l) => l.visiteeAujourdhui).length;
  const indexCourante = lignes.findIndex(
    (l) => !l.visiteeAujourdhui && !passees.has(l.colonie.id)
  );
  const maintenant = new Date().toISOString();

  function passer(colonieId) {
    setPassees((precedent) => new Set(precedent).add(colonieId));
  }

  return (
    <div className="min-h-screen bg-ground text-ink flex flex-col max-w-md mx-auto">
      <EnTeteEcran
        retourLibelle="← Ruchers"
        onRetour={onRetour}
        titre="Tournée en cours"
        contexte={`${rucher.nom} · ${dateCourte(maintenant)} · ${heureCourte(maintenant)}`}
        droite={
          <span className="font-mono text-26 font-bold leading-none text-ink">
            {faites}
            <span className="text-13 text-sur-miel">/{lignes.length}</span>
          </span>
        }
        progression={{ fait: faites, total: lignes.length || 1 }}
      />

      <div className="flex-1 px-4 pt-3.5 flex flex-col">
        {lignes.length === 0 && (
          <p className="text-13 text-ink-secondary">Aucune colonie dans cette tournée.</p>
        )}

        {lignes.map((ligne, index) => {
          const estCourante = index === indexCourante;
          const estVisitee = ligne.visiteeAujourdhui;
          const dernierJalon = index === lignes.length - 1;

          return (
            <div key={ligne.colonie.id} className="flex gap-3">
              <div className="w-7 flex flex-col items-center shrink-0">
                {estVisitee && <div className="w-3.5 h-3.5 rounded-full bg-vert shrink-0" />}
                {estCourante && (
                  <div className="w-3.5 h-3.5 rounded-full bg-ground border-[3px] border-vert shrink-0" />
                )}
                {!estVisitee && !estCourante && (
                  <div className="w-3.5 h-3.5 rounded-full bg-ground border-2 border-rule-strong shrink-0" />
                )}
                {!dernierJalon && (
                  <div className={`flex-1 w-0.5 ${estVisitee ? 'bg-vert' : 'bg-rule-strong'}`} />
                )}
              </div>

              {estVisitee && (
                <div className="flex-1 pb-3.5 opacity-55">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-13 font-bold text-ink">Ruche {ligne.ruche.numero}</span>
                    <span className="font-mono text-11 font-bold text-vert shrink-0">
                      ✓ {heureCourte(ligne.derniereVisite.date)}
                    </span>
                  </div>
                  <p className="font-mono text-12 text-ink-secondary">
                    {metrique(ligne.couvain)} couvain · {metrique(ligne.provisions)} provis.
                  </p>
                </div>
              )}

              {estCourante && (
                <div className="flex-1 pb-3.5">
                  <div
                    className={`border rounded p-2.5 ${
                      ligne.etat === 'urgent'
                        ? 'border-rule-strong border-l-4 border-l-urgent-ink bg-urgent-bg'
                        : 'border-rule bg-surface'
                    }`}
                  >
                    <div className="flex justify-between items-baseline gap-2">
                      <span
                        className={`text-15 font-bold ${
                          ligne.etat === 'urgent' ? 'text-urgent-ink' : 'text-ink'
                        }`}
                      >
                        Ruche {ligne.ruche.numero}
                      </span>
                      <PastilleEtat etat={ligne.etat} surFondTeinte={ligne.etat === 'urgent'} />
                    </div>
                    <p
                      className={`font-mono text-12 ${
                        ligne.etat === 'urgent' ? 'text-urgent-ink' : 'text-ink-secondary'
                      }`}
                    >
                      {metrique(ligne.couvain)} couvain · {metrique(ligne.provisions)} provis. ·{' '}
                      {anciennete(ligne.joursDepuisVisite)}
                    </p>
                    {ligne.note && (
                      <p
                        className={`text-12 italic ${
                          ligne.etat === 'urgent' ? 'text-urgent-ink' : 'text-ink-secondary'
                        }`}
                      >
                        « {ligne.note} »
                      </p>
                    )}
                    <div className="flex gap-1.5 pt-2.5">
                      <button
                        type="button"
                        onClick={() => onOuvrirVisite(ligne.colonie.id)}
                        className="flex-1 h-11 rounded bg-ink text-surface text-13 font-bold"
                      >
                        Saisir la visite
                      </button>
                      <button
                        type="button"
                        onClick={() => passer(ligne.colonie.id)}
                        className="w-[92px] h-11 rounded border border-rule-strong text-ink-secondary text-13 font-bold"
                      >
                        Passer
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!estVisitee && !estCourante && (
                <LigneAVenir ligne={ligne} onOuvrir={() => onOuvrirVisite(ligne.colonie.id)} />
              )}
            </div>
          );
        })}

        {lignes.length > 0 && faites === lignes.length && (
          <p className="text-13 font-bold text-normale-ink bg-normale-bg rounded p-2.5 mb-3.5">
            ✓ Toutes les colonies ont été visitées aujourd'hui.
          </p>
        )}

        <div className="mt-auto py-3 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={onRetour}
            className="h-[46px] w-full rounded bg-ink text-surface text-15 font-bold"
          >
            Clore la tournée
          </button>
          <p className="text-11 text-ink-muted text-center">
            Balayer une ligne vers la droite : ouvrir la saisie
          </p>
        </div>
      </div>
    </div>
  );
}
