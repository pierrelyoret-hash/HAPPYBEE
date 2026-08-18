// Extrait de l'upgrade Dexie v4 (src/db/db.js) pour être rejouable ailleurs :
// ponte_qualite → score_ponte (+ anomalie ponte_males pour "males"),
// correction écrans L1 §7/§9.2. Une migration Dexie ne se déclenche qu'au
// changement de version du schéma, jamais à une insertion — restaurerDonnees
// (src/db/repositories/sauvegarde.js) fait clear() + bulkAdd() de lignes
// brutes sans jamais rejouer les upgrades. Une sauvegarde JSON antérieure à
// v4 restaurée sur une base déjà en v10+ réintroduirait donc ponte_qualite
// sans normalisation si cette transformation n'était pas rejouée à la main,
// ligne par ligne, à la restauration (bug constaté par 4-COMMIT & DEPLOY,
// 16/08/2026). Mute l'objet visite en place, comme l'upgrade d'origine.
export function normaliserPonteQualite(visite) {
  if (visite.ponte_qualite === 'males') {
    visite.anomalies = Array.isArray(visite.anomalies) ? visite.anomalies : [];
    if (!visite.anomalies.includes('ponte_males')) {
      visite.anomalies.push('ponte_males');
    }
    if (visite.score_ponte == null) {
      visite.score_ponte = 0;
    }
  } else if (visite.score_ponte == null) {
    if (visite.ponte_qualite === 'compacte') visite.score_ponte = 4;
    else if (visite.ponte_qualite === 'lacunaire') visite.score_ponte = 2;
    else if (visite.ponte_qualite === 'absente') visite.score_ponte = 0;
  }
  delete visite.ponte_qualite;
}
