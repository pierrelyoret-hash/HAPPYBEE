// Campagne apicole (arbitrage du 14/08/2026, retour d'usage réel) : une
// saison va d'avril à mars de l'année suivante — hivernage à hivernage,
// plus proche du cycle réel de la colonie qu'une année civile.
export function obtenirSaison(dateIso) {
  if (!dateIso) return null;
  const d = new Date(dateIso);
  const annee = d.getFullYear();
  const mois = d.getMonth() + 1; // 1-12
  const debut = mois >= 4 ? annee : annee - 1;
  return { debut, label: `${debut}-${debut + 1}` };
}
