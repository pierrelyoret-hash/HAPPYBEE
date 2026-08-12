import { useEffect, useState } from 'react';
import { db } from '../../db/db.js';
import { listerHistoriqueSanitaire } from '../../db/repositories/sanitaire.js';
import { surSync } from '../../lib/sync.js';
import { BoutonRetour } from '../../components/BoutonRetour.jsx';
import {
  VOIE_LIBELLES,
  METHODE_LIBELLES,
  NIVEAU_ALERTE_LIBELLES,
  TYPE_NOURRISSEMENT_LIBELLES,
  ORIGINE_LIBELLES,
} from '../../lib/libellesSanitaire.js';

function dateLisible(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('fr-FR');
}

export function HistoriqueSanitaire({
  colonieId,
  onRetour,
  onOuvrirSaisieTraitement,
  onOuvrirSaisieComptageVarroa,
  onOuvrirSaisieNourrissement,
}) {
  const [ruche, setRuche] = useState(null);
  const [lignes, setLignes] = useState(null); // null = en cours de chargement

  useEffect(() => {
    if (!colonieId) return;
    async function charger() {
      const colonie = await db.colonie.get(colonieId);
      const r = colonie ? await db.ruche.get(colonie.ruche_id) : null;
      setRuche(r ?? null);
      setLignes(await listerHistoriqueSanitaire(colonieId));
    }
    charger();
    // Se recharge tout seul quand une synchronisation en arrière-plan a pu
    // apporter de nouvelles données depuis un autre appareil.
    return surSync(charger);
  }, [colonieId]);

  if (lignes === null) return null;

  return (
    <div className="min-h-screen bg-ground text-ink p-4 flex flex-col gap-4 max-w-md mx-auto">
      <header className="flex flex-col gap-1">
        <BoutonRetour onRetour={onRetour} />
        <h1 className="text-20 font-bold">
          {ruche ? `Ruche ${ruche.numero}` : 'Colonie'} — Sanitaire
        </h1>
      </header>

      <div className="flex flex-col gap-2">
        {onOuvrirSaisieTraitement && (
          <button
            type="button"
            onClick={() => onOuvrirSaisieTraitement(colonieId)}
            className="h-11 w-full rounded bg-ink text-surface text-15 font-bold"
          >
            + Traitement
          </button>
        )}
        {onOuvrirSaisieComptageVarroa && (
          <button
            type="button"
            onClick={() => onOuvrirSaisieComptageVarroa(colonieId)}
            className="h-11 w-full rounded border border-rule-strong text-ink text-15 font-bold"
          >
            + Comptage varroa
          </button>
        )}
        {onOuvrirSaisieNourrissement && (
          <button
            type="button"
            onClick={() => onOuvrirSaisieNourrissement(colonieId)}
            className="h-11 w-full rounded border border-rule-strong text-ink text-15 font-bold"
          >
            + Nourrissement
          </button>
        )}
      </div>

      {lignes.length === 0 && (
        <p className="text-13 text-ink-secondary">
          Aucun traitement, comptage ou nourrissement enregistré pour cette colonie.
        </p>
      )}

      <ul className="bg-surface rounded border border-rule divide-y divide-rule">
        {lignes.map((ligne) => (
          <li key={ligne.id} className="p-3">
            {ligne._type === 'traitement' && (
              <>
                <p className="text-15 font-bold">
                  Traitement{ligne.produit ? ` — ${ligne.produit}` : ''}
                </p>
                <p className="text-11 text-ink-muted mb-2">
                  {dateLisible(ligne.date_debut) ?? 'date non renseignée'}
                  {ligne.date_fin && ligne.date_fin !== ligne.date_debut
                    ? ` → ${dateLisible(ligne.date_fin)}`
                    : ''}
                </p>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-13 font-mono">
                  {ligne.voie && (
                    <>
                      <dt className="text-ink-secondary font-sans">Voie</dt>
                      <dd>{VOIE_LIBELLES[ligne.voie] ?? ligne.voie}</dd>
                    </>
                  )}
                  {ligne.dosage && (
                    <>
                      <dt className="text-ink-secondary font-sans">Dosage</dt>
                      <dd>{ligne.dosage}</dd>
                    </>
                  )}
                  {ligne.delai_attente_jours != null && (
                    <>
                      <dt className="text-ink-secondary font-sans">Délai d'attente</dt>
                      <dd>{ligne.delai_attente_jours} j</dd>
                    </>
                  )}
                  {ligne.date_fin_delai_attente && (
                    <>
                      <dt className="text-ink-secondary font-sans">Fin de délai</dt>
                      <dd>{dateLisible(ligne.date_fin_delai_attente)}</dd>
                    </>
                  )}
                </dl>
                {ligne.conforme_bio && (
                  <p className="text-13 text-action-ink mt-2">Conforme bio</p>
                )}
                {ligne.motif && (
                  <p className="text-13 text-ink-secondary mt-2">Motif : {ligne.motif}</p>
                )}
                {ligne.notes && (
                  <p className="text-13 text-ink-secondary mt-2 italic">« {ligne.notes} »</p>
                )}
              </>
            )}

            {ligne._type === 'comptage_varroa' && (
              <>
                <p className="text-15 font-bold">Comptage varroa</p>
                <p className="text-11 text-ink-muted mb-2">
                  {dateLisible(ligne.date) ?? 'date non renseignée'}
                </p>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-13 font-mono">
                  {ligne.methode && (
                    <>
                      <dt className="text-ink-secondary font-sans">Méthode</dt>
                      <dd>{METHODE_LIBELLES[ligne.methode] ?? ligne.methode}</dd>
                    </>
                  )}
                  {ligne.nb_varroas != null && (
                    <>
                      <dt className="text-ink-secondary font-sans">Varroas comptés</dt>
                      <dd>{ligne.nb_varroas}</dd>
                    </>
                  )}
                  {ligne.varroas_par_jour != null && (
                    <>
                      <dt className="text-ink-secondary font-sans">Varroas/jour</dt>
                      <dd>{ligne.varroas_par_jour.toFixed(2)}</dd>
                    </>
                  )}
                </dl>
                {ligne.niveau_alerte && (
                  <p
                    className={`text-13 font-bold mt-2 ${
                      ligne.niveau_alerte === 'fort'
                        ? 'text-urgent-ink'
                        : ligne.niveau_alerte === 'modere'
                          ? 'text-action-ink'
                          : 'text-ink-secondary'
                    }`}
                  >
                    Niveau d'alerte : {NIVEAU_ALERTE_LIBELLES[ligne.niveau_alerte]}
                  </p>
                )}
              </>
            )}

            {ligne._type === 'nourrissement' && (
              <>
                <p className="text-15 font-bold">
                  Nourrissement
                  {ligne.type ? ` — ${TYPE_NOURRISSEMENT_LIBELLES[ligne.type] ?? ligne.type}` : ''}
                </p>
                <p className="text-11 text-ink-muted mb-2">
                  {dateLisible(ligne.date) ?? 'date non renseignée'}
                </p>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-13 font-mono">
                  {ligne.quantite != null && (
                    <>
                      <dt className="text-ink-secondary font-sans">Quantité</dt>
                      <dd>
                        {ligne.quantite}
                        {ligne.unite ? ` ${ligne.unite}` : ''}
                      </dd>
                    </>
                  )}
                  {ligne.origine_produit && (
                    <>
                      <dt className="text-ink-secondary font-sans">Origine</dt>
                      <dd>{ORIGINE_LIBELLES[ligne.origine_produit] ?? ligne.origine_produit}</dd>
                    </>
                  )}
                </dl>
                {ligne.composition && (
                  <p className="text-13 text-ink-secondary mt-2">
                    Composition : {ligne.composition}
                  </p>
                )}
                {ligne.notes && (
                  <p className="text-13 text-ink-secondary mt-2 italic">« {ligne.notes} »</p>
                )}
              </>
            )}
          </li>
        ))}
      </ul>

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
