import {
  VOIE_LIBELLES,
  METHODE_LIBELLES,
  NIVEAU_ALERTE_LIBELLES,
  TYPE_NOURRISSEMENT_LIBELLES,
  ORIGINE_LIBELLES,
} from './libellesSanitaire.js';
import { PRODUIT_LIBELLES, MODE_SAISIE_LIBELLES } from './libellesRecolte.js';
import { TYPE_MOUVEMENT_LIBELLES } from './libellesMouvement.js';

const TYPE_EVENEMENT_LIBELLES = {
  visite: 'Visite',
  traitement: 'Traitement',
  comptage_varroa: 'Comptage varroa',
  nourrissement: 'Nourrissement',
  recolte: 'Récolte',
  mouvement: 'Mouvement',
};

function detailPaires(paires) {
  return paires
    .filter(([, valeur]) => valeur != null && valeur !== '')
    .map(([cle, valeur]) => `${cle}: ${valeur}`)
    .join(', ');
}

// CSV séparateur point-virgule (convention M10/M11, cahier des charges
// F10.2) : un champ contenant ; " ou un saut de ligne doit être entre
// guillemets, avec les guillemets internes doublés.
function champCsv(valeur) {
  const texte = valeur == null ? '' : String(valeur);
  if (/[;"\n\r]/.test(texte)) {
    return `"${texte.replace(/"/g, '""')}"`;
  }
  return texte;
}

function construireLigne(evenement) {
  const ruche = evenement._ruche ? `Ruche ${evenement._ruche.numero}` : '';
  const rucher = evenement._rucher?.nom ?? '';
  const type = TYPE_EVENEMENT_LIBELLES[evenement._type] ?? evenement._type;
  const date = evenement._date ? evenement._date.slice(0, 10) : '';

  switch (evenement._type) {
    case 'visite': {
      const v = evenement.visite;
      return {
        rucher,
        ruche,
        type,
        date,
        libelle: `Visite${v.type ? ` — ${v.type}` : ''}`,
        detail: detailPaires([
          ['couvain_opercule', v.nb_cadres_couvain_opercule],
          ['couvain_ouvert', v.nb_cadres_couvain_ouvert],
          ['provisions', v.nb_cadres_provisions],
          ['population', v.population],
          ['reine_vue', v.reine_vue == null ? null : v.reine_vue ? 'oui' : 'non'],
          ['oeufs_vus', v.oeufs_vus == null ? null : v.oeufs_vus ? 'oui' : 'non'],
          ['score_ponte', v.score_ponte],
          ['anomalies', v.anomalies?.join('/')],
          ['observation_libre', v.observation_libre],
        ]),
      };
    }
    case 'traitement': {
      const t = evenement.traitement;
      return {
        rucher,
        ruche,
        type,
        date,
        libelle: `Traitement${t.produit ? ` — ${t.produit}` : ''}`,
        detail: detailPaires([
          ['voie', t.voie ? (VOIE_LIBELLES[t.voie] ?? t.voie) : null],
          ['dosage', t.dosage],
          ['delai_attente_jours', t.delai_attente_jours],
          ['date_fin_delai_attente', t.date_fin_delai_attente],
          ['conforme_bio', t.conforme_bio ? 'oui' : null],
          ['notes', t.notes],
        ]),
      };
    }
    case 'comptage_varroa': {
      const c = evenement.comptage;
      return {
        rucher,
        ruche,
        type,
        date,
        libelle: 'Comptage varroa',
        detail: detailPaires([
          ['methode', c.methode ? (METHODE_LIBELLES[c.methode] ?? c.methode) : null],
          ['nb_varroas', c.nb_varroas],
          ['varroas_par_jour', c.varroas_par_jour?.toFixed?.(2)],
          ['niveau_alerte', c.niveau_alerte ? NIVEAU_ALERTE_LIBELLES[c.niveau_alerte] : null],
        ]),
      };
    }
    case 'nourrissement': {
      const n = evenement.nourrissement;
      return {
        rucher,
        ruche,
        type,
        date,
        libelle: `Nourrissement${n.type ? ` — ${TYPE_NOURRISSEMENT_LIBELLES[n.type] ?? n.type}` : ''}`,
        detail: detailPaires([
          ['quantite', n.quantite != null ? `${n.quantite}${n.unite ? ` ${n.unite}` : ''}` : null],
          ['composition', n.composition],
          ['origine', n.origine_produit ? ORIGINE_LIBELLES[n.origine_produit] : null],
          ['notes', n.notes],
        ]),
      };
    }
    case 'recolte': {
      const r = evenement.recolte;
      return {
        rucher,
        ruche,
        type,
        date,
        libelle: `Récolte — ${PRODUIT_LIBELLES[r.produit] ?? r.produit ?? '?'}`,
        detail: detailPaires([
          ['poids_net_kg', r.poids_net],
          ['mode_saisie', r.mode_saisie ? (MODE_SAISIE_LIBELLES[r.mode_saisie] ?? r.mode_saisie) : null],
          ['type_miellee', r.type_miellee],
          ['notes', r.notes],
        ]),
      };
    }
    case 'mouvement': {
      const m = evenement.mouvement;
      return {
        rucher,
        ruche,
        type,
        date,
        libelle: `Mouvement — ${TYPE_MOUVEMENT_LIBELLES[m.type] ?? m.type ?? '?'}`,
        detail: detailPaires([
          ['motif', m.motif],
          ['notes', m.notes],
        ]),
      };
    }
    default:
      return { rucher, ruche, type, date, libelle: type, detail: '' };
  }
}

// Export consolidé (retour d'usage réel du 14/08/2026) : un fichier unique,
// une ligne par événement, toute l'exploitation — visite, sanitaire,
// récolte, mouvement. Distinct de l'export CSV par table (F10.2, prévu en
// L6) : ici, une vue humaine et croisable, pas une sauvegarde par table.
export function genererCsvConsolide(evenements) {
  const entetes = ['Rucher', 'Ruche', 'Type', 'Date', 'Libellé', 'Détail'];
  const lignes = evenements.map((e) => {
    const { rucher, ruche, type, date, libelle, detail } = construireLigne(e);
    return [rucher, ruche, type, date, libelle, detail].map(champCsv).join(';');
  });
  return [entetes.join(';'), ...lignes].join('\r\n');
}
