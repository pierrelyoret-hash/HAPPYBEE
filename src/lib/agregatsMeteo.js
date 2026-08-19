// L3bis (brief_L3bis_moteur_regles.md §6) : agrégats calculés localement
// depuis meteo_journaliere, jamais par appel réseau — condition de F12.7
// (le moteur doit fonctionner intégralement hors-ligne une fois
// l'historique constitué). Seuils par défaut de M12 §4.2, tous
// paramétrables (L3b.9) : chaque fonction accepte ses seuils en paramètre,
// jamais en dur à l'intérieur — à recaler sur le contexte réel (450 m
// d'altitude en Haut-Mâconnais, cf. brief §6).
//
// `jours` : tableau de lignes meteo_journaliere (voir
// src/db/repositories/meteoJournaliere.js), triées par date croissante —
// c'est ce que renvoie déjà obtenirHistoriqueRucher.

export const SEUILS_PAR_DEFAUT = {
  canicule: { tMaxMin: 32, joursConsecutifsMin: 3 },
  secheresse: { cumulPrecipitationsMaxMm: 20, fenetreJours: 30 },
  pluieProlongee: { joursConsecutifsMin: 5 },
  // Le brief (§6) ne donne que la borne de début ("après le 1er avril") —
  // sans borne de fin, un gel de novembre est mathématiquement "après le
  // 1er avril" de sa propre année et se ferait à tort détecter comme
  // "tardif" (constaté à la vérification manuelle, 19/08/2026, sur un
  // exemple réel du 18/11). "Tardif" n'a de sens que dans la fenêtre de
  // printemps où un gel est un risque (couvain déjà présent, floraison
  // engagée) — borné au 31 mai par défaut, à confirmer par 1-SPEC.
  gelTardif: { tMinMax: 0, debut: [4, 1], fin: [5, 31] }, // 1er avril → 31 mai
  fenetreVisite: { tMaxMin: 15, tMaxMax: 28, ventMaxKmh: 20, precipitationsMaxMm: 0 },
};

// Regroupe les jours consécutifs (par date, pas par index — un trou dans
// l'historique ne doit jamais faire croire à une continuité) qui vérifient
// `predicat`, et ne garde que les séries d'au moins `longueurMin` jours.
function detecterSeriesConsecutives(jours, predicat, longueurMin) {
  const episodes = [];
  let serieCourante = [];

  function jourSuivantAttendu(dateIso) {
    const d = new Date(dateIso);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  for (const jour of jours) {
    const continueLaSerie =
      serieCourante.length > 0 &&
      jourSuivantAttendu(serieCourante[serieCourante.length - 1].date) === jour.date;
    if (!continueLaSerie && serieCourante.length > 0) {
      if (serieCourante.length >= longueurMin) episodes.push(construireEpisode(serieCourante));
      serieCourante = [];
    }
    if (predicat(jour)) serieCourante.push(jour);
  }
  if (serieCourante.length >= longueurMin) episodes.push(construireEpisode(serieCourante));
  return episodes;
}

function construireEpisode(jours) {
  return {
    dateDebut: jours[0].date,
    dateFin: jours[jours.length - 1].date,
    dureeJours: jours.length,
  };
}

export function detecterCanicule(jours, seuils = SEUILS_PAR_DEFAUT.canicule) {
  return detecterSeriesConsecutives(
    jours,
    (j) => j.t_max != null && j.t_max >= seuils.tMaxMin,
    seuils.joursConsecutifsMin
  );
}

export function detecterPluieProlongee(jours, seuils = SEUILS_PAR_DEFAUT.pluieProlongee) {
  return detecterSeriesConsecutives(
    jours,
    (j) => j.precipitations_mm != null && j.precipitations_mm > 0,
    seuils.joursConsecutifsMin
  );
}

// Gel tardif : un événement ponctuel (pas une série), un jour à la fois —
// entre `debut` et `fin` (mois, jour) de l'année de ce jour, jamais comparé
// entre années.
export function detecterGelTardif(jours, seuils = SEUILS_PAR_DEFAUT.gelTardif) {
  const [moisDebut, jourDebut] = seuils.debut;
  const [moisFin, jourFin] = seuils.fin;
  return jours.filter((j) => {
    if (j.t_min == null || j.t_min >= seuils.tMinMax) return false;
    const d = new Date(j.date);
    const annee = d.getUTCFullYear();
    const debutFenetre = new Date(Date.UTC(annee, moisDebut - 1, jourDebut));
    const finFenetre = new Date(Date.UTC(annee, moisFin - 1, jourFin));
    return d >= debutFenetre && d <= finFenetre;
  });
}

// Sécheresse : fenêtre glissante, pas une série de jours consécutifs — le
// cumul de précipitations sur les `fenetreJours` jours qui précèdent
// (bornes incluses) chaque jour évalué. Ne considère que les jours dont la
// fenêtre complète est couverte par `jours` (sinon un historique tronqué en
// début de période se lirait à tort comme une sécheresse).
export function detecterSecheresse(jours, seuils = SEUILS_PAR_DEFAUT.secheresse) {
  const resultats = [];
  for (let i = seuils.fenetreJours - 1; i < jours.length; i++) {
    const fenetre = jours.slice(i - seuils.fenetreJours + 1, i + 1);
    if (fenetre.some((j) => j.precipitations_mm == null)) continue;
    const cumul = fenetre.reduce((total, j) => total + j.precipitations_mm, 0);
    if (cumul < seuils.cumulPrecipitationsMaxMm) {
      resultats.push({
        date: jours[i].date,
        cumulPrecipitationsMm: Math.round(cumul * 10) / 10,
        fenetreJours: seuils.fenetreJours,
      });
    }
  }
  return resultats;
}

// Fenêtre de visite favorable : jour par jour, pas une série — distinct de
// estCreneauFavorable (src/lib/meteo.js, F8.3), qui reste l'heuristique
// fixe et non paramétrable de l'écran Météo sur des PRÉVISIONS. Celle-ci
// tourne sur l'historique OBSERVÉ (meteo_journaliere) avec des seuils
// réglables par l'exploitant (L3b.9) — même esprit, calculs séparés.
export function estFenetreVisiteFavorable(jour, seuils = SEUILS_PAR_DEFAUT.fenetreVisite) {
  if (jour.t_max == null || jour.vent_moyen == null || jour.precipitations_mm == null) {
    return false;
  }
  return (
    jour.t_max >= seuils.tMaxMin &&
    jour.t_max <= seuils.tMaxMax &&
    jour.vent_moyen <= seuils.ventMaxKmh &&
    jour.precipitations_mm <= seuils.precipitationsMaxMm
  );
}
