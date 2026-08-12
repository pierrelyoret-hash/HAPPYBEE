import jsPDF from 'jspdf';
import {
  VOIE_LIBELLES,
  METHODE_LIBELLES,
  NIVEAU_ALERTE_LIBELLES,
} from './libellesSanitaire.js';

const MARGE = 14;
const LARGEUR_PAGE = 210;
const HAUTEUR_PAGE = 297;
const HAUTEUR_LIGNE = 6;

function dateLisible(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR');
}

// Petit gestionnaire de pagination manuelle : pas de dépendance
// jspdf-autotable pour un besoin aussi simple (deux listes de lignes).
function creerCurseur(doc) {
  let y = MARGE;
  return {
    ligne(texte, options = {}) {
      if (y > HAUTEUR_PAGE - MARGE) {
        doc.addPage();
        y = MARGE;
      }
      doc.setFont('helvetica', options.gras ? 'bold' : 'normal');
      doc.setFontSize(options.taille ?? 10);
      doc.text(texte, MARGE, y);
      y += options.hauteur ?? HAUTEUR_LIGNE;
    },
    espace(hauteur = HAUTEUR_LIGNE) {
      y += hauteur;
    },
  };
}

// Correspond aux blocs "encadrement sanitaire" et "interventions
// vétérinaires" de l'article 3 de l'arrêté du 5 juin 2000 (F5.1) — pas le
// registre complet à cinq blocs (brief L2.2 §2 point 8, acceptation §6.6).
export function genererPdfSanitaire({ traitements, comptages, ruchesParColonie, periodeDebut, periodeFin }) {
  const doc = new jsPDF();
  const curseur = creerCurseur(doc);

  curseur.ligne('Export sanitaire', { gras: true, taille: 16, hauteur: 9 });
  curseur.ligne(
    `Période du ${dateLisible(periodeDebut)} au ${dateLisible(periodeFin)} — généré le ${dateLisible(new Date().toISOString())}`,
    { taille: 10 }
  );
  curseur.espace(2);
  curseur.ligne(
    "Ce document couvre les blocs « encadrement sanitaire » et « interventions vétérinaires ».",
    { taille: 9 }
  );
  curseur.ligne(
    "Il ne constitue pas le registre d'élevage réglementaire complet (arrêté du 5 juin 2000).",
    { taille: 9 }
  );
  curseur.espace(4);

  curseur.ligne(`Traitements (${traitements.length})`, { gras: true, taille: 12, hauteur: 8 });
  if (traitements.length === 0) {
    curseur.ligne('Aucun traitement sur la période.', { taille: 10 });
  }
  for (const t of traitements) {
    const ruche = ruchesParColonie.get(t.colonie_id);
    curseur.ligne(
      `Ruche ${ruche?.numero ?? '?'} — ${dateLisible(t.date_debut)}${t.produit ? ` — ${t.produit}` : ''}`,
      { gras: true, taille: 10 }
    );
    const details = [
      t.voie && `Voie : ${VOIE_LIBELLES[t.voie] ?? t.voie}`,
      t.dosage && `Dosage : ${t.dosage}`,
      t.delai_attente_jours != null && `Délai d'attente : ${t.delai_attente_jours} j`,
      t.date_fin_delai_attente && `Fin de délai : ${dateLisible(t.date_fin_delai_attente)}`,
      t.conforme_bio ? 'Conforme bio' : null,
    ].filter(Boolean);
    if (details.length > 0) {
      curseur.ligne(details.join('  ·  '), { taille: 9 });
    }
    curseur.espace(2);
  }

  curseur.espace(4);
  curseur.ligne(`Comptages varroa (${comptages.length})`, { gras: true, taille: 12, hauteur: 8 });
  if (comptages.length === 0) {
    curseur.ligne('Aucun comptage sur la période.', { taille: 10 });
  }
  for (const c of comptages) {
    const ruche = ruchesParColonie.get(c.colonie_id);
    curseur.ligne(`Ruche ${ruche?.numero ?? '?'} — ${dateLisible(c.date)}`, { gras: true, taille: 10 });
    const details = [
      c.methode && `Méthode : ${METHODE_LIBELLES[c.methode] ?? c.methode}`,
      c.nb_varroas != null && `Varroas comptés : ${c.nb_varroas}`,
      c.varroas_par_jour != null && `Varroas/jour : ${c.varroas_par_jour.toFixed(2)}`,
      c.niveau_alerte && `Niveau d'alerte : ${NIVEAU_ALERTE_LIBELLES[c.niveau_alerte]}`,
    ].filter(Boolean);
    if (details.length > 0) {
      curseur.ligne(details.join('  ·  '), { taille: 9 });
    }
    curseur.espace(2);
  }

  return doc;
}
