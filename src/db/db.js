import Dexie from 'dexie';

export const db = new Dexie('happybee');

// Champs communs à toutes les tables (non indexés sauf mention) :
// id (uuid), created_at, updated_at, deleted_at — suppression logique uniquement.
db.version(1).stores({
  rucher: 'id, deleted_at',
  ruche: 'id, rucher_id, statut, deleted_at',
  colonie: 'id, ruche_id, statut, deleted_at',
  reine: 'id, colonie_id, deleted_at',
  visite: 'id, colonie_id, date, deleted_at',
  tache: 'id, colonie_id, rucher_id, statut, date_echeance, deleted_at',
});

// v2 : index composé pour retrouver rapidement la dernière visite d'une
// colonie (pré-remplissage différentiel de l'écran B).
db.version(2).stores({
  visite: 'id, colonie_id, date, [colonie_id+date], deleted_at',
});

// v3 (lot L1+) : ajout de observation_cadre (schéma seul, aucune interface
// avant L2) et de photo (schéma seul, aucune interface avant L2). Additive
// uniquement — aucune table ni index existant n'est modifié, les données
// déjà saisies ne sont pas affectées par cette migration. Les nouveaux
// champs de visite (score_ponte, signes_sanitaires, source_agregats,
// suspicion_reglementee) ne sont pas indexés : ils n'ont pas besoin de
// figurer dans stores().
db.version(3).stores({
  observation_cadre: 'id, visite_id, deleted_at',
  photo: 'id, visite_id, observation_cadre_id, deleted_at',
});

// v4 (correction écrans L1 §7/§9.2) : ponte_qualite et score_ponte
// décrivaient la même chose et pouvaient se contredire. ponte_qualite est
// supprimé ; score_ponte (0-5) devient l'unique champ. Migration des
// valeurs existantes : compacte→4, lacunaire→2, absente→0. "Mâles" n'est
// pas un degré de compacité : il devient l'anomalie "ponte_males" et
// score_ponte est mis à 0 (aucune ponte de reine constatée). Si
// score_ponte était déjà renseigné (saisi après le lot L1+), il est
// conservé tel quel — seul ponte_qualite est retiré. Aucune table ni
// index modifié : pas de changement dans stores().
db.version(4)
  .stores({})
  .upgrade(async (tx) => {
    await tx
      .table('visite')
      .toCollection()
      .modify((visite) => {
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
      });
  });
