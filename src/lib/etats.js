// Système à 4 niveaux (addendum ergonomie §4). En L1 :
// - "urgent" se calcule uniquement sur les échéances de tâches saisies à la main.
// - "à visiter" se calcule sur le délai depuis la dernière visite.
// - "action" reste inactif faute de moteur de recommandations (décision validée).
//
// Seuil saisonnier proposé pour "à visiter" — valeur de départ à réviser
// après une saison réelle (cf. cahier des charges, seuils comparables).
export const SEUIL_JOURS_A_VISITER = 21;

export function joursDepuis(dateIso) {
  if (!dateIso) return null;
  const diffMs = Date.now() - new Date(dateIso).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function calculerEtat({ tachesOuvertes = [], joursDepuisVisite }) {
  const aUneTacheEchue = tachesOuvertes.some(
    (t) => t.date_echeance && new Date(t.date_echeance).getTime() <= Date.now()
  );
  if (aUneTacheEchue) return 'urgent';

  if (joursDepuisVisite === null || joursDepuisVisite > SEUIL_JOURS_A_VISITER) {
    return 'a_visiter';
  }

  return 'normale';
}
