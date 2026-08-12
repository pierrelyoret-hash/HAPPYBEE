// Import de archives_apicoles.csv (brief §6). Règle impérative : aucune
// tentative d'extraction automatique vers les champs structurés — le texte
// des colonnes libres est conservé intégralement, jamais interprété.

const COLONNES_ATTENDUES = [
  'Date',
  'Heure',
  'Ruche',
  'Type',
  'Observation',
  'Contexte climatique',
  'Action entreprise',
  'Résultat/Suivi',
  'Priorité',
  'Échéance',
  'Notes',
];

function videSiTiret(valeur) {
  const v = (valeur ?? '').trim();
  return v === '' || v === '-' ? null : v;
}

function parserDateFr(texte) {
  if (!texte || texte === '-') return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texte.trim());
  if (!m) return null;
  const [, jour, mois, annee] = m;
  const d = new Date(`${annee}-${mois}-${jour}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Sépare le fichier en lignes valides (syntaxiquement correctes, triées
// chronologiquement) et lignes en erreur (colonnes manquantes, date invalide).
export function parserArchivesCsv(texte) {
  const lignesBrutes = texte.split(/\r\n|\n|\r/).filter((l) => l.trim() !== '');
  if (lignesBrutes.length === 0) {
    return { lignesValides: [], lignesErreur: [] };
  }

  const lignesValides = [];
  const lignesErreur = [];

  for (let i = 1; i < lignesBrutes.length; i++) {
    const numeroLigne = i + 1; // 1-based, +1 pour compter l'en-tête
    const champs = lignesBrutes[i].split(';');

    if (champs.length !== COLONNES_ATTENDUES.length) {
      lignesErreur.push({
        numeroLigne,
        motif: `${champs.length} colonnes trouvées, ${COLONNES_ATTENDUES.length} attendues`,
      });
      continue;
    }

    const [
      dateTxt,
      heureTxt,
      rucheTxt,
      typeTxt,
      observationTxt,
      climatTxt,
      actionTxt,
      resultatTxt,
      prioriteTxt,
      echeanceTxt,
      notesTxt,
    ] = champs.map((c) => c.trim());

    const date = parserDateFr(dateTxt);
    if (!date) {
      lignesErreur.push({ numeroLigne, motif: `date invalide : "${dateTxt}"` });
      continue;
    }

    lignesValides.push({
      numeroLigne,
      date,
      heure: videSiTiret(heureTxt),
      ruche: videSiTiret(rucheTxt),
      type: videSiTiret(typeTxt),
      observation: videSiTiret(observationTxt),
      contexteClimatique: videSiTiret(climatTxt),
      actionEntreprise: videSiTiret(actionTxt),
      resultatSuivi: videSiTiret(resultatTxt),
      priorite: videSiTiret(prioriteTxt),
      echeance: parserDateFr(echeanceTxt),
      notes: videSiTiret(notesTxt),
    });
  }

  lignesValides.sort((a, b) => a.date.getTime() - b.date.getTime());

  return { lignesValides, lignesErreur };
}

function mapperPriorite(texte) {
  if (!texte) return null;
  const norm = texte.trim().toLowerCase();
  if (norm === 'urgent') return 'urgente';
  if (norm === 'moyen') return 'moyenne';
  if (norm === 'faible') return 'faible';
  return null;
}

// Concatène les colonnes libres sans les interpréter — chaque morceau reste
// identifiable par son étiquette d'origine.
function construireObservationLibre(ligne) {
  const parties = [
    ligne.observation && `Observation : ${ligne.observation}`,
    ligne.contexteClimatique && `Contexte climatique : ${ligne.contexteClimatique}`,
    ligne.resultatSuivi && `Résultat/Suivi : ${ligne.resultatSuivi}`,
    ligne.notes && `Notes : ${ligne.notes}`,
  ].filter(Boolean);
  return parties.length > 0 ? parties.join('\n') : null;
}

// Résout chaque ligne vers une ou plusieurs colonies, puis construit les
// enregistrements visite/tache à écrire. modeToutes ∈ 'dupliquer' | 'tache_rucher'.
export function resoudreLignes(lignesValides, { rucher, ruches, colonies, modeToutes }) {
  const rucheParNumero = new Map(ruches.map((r) => [String(r.numero), r]));
  const colonieParRucheId = new Map(colonies.map((c) => [c.ruche_id, c]));

  const enregistrements = [];
  const erreursResolution = [];

  for (const ligne of lignesValides) {
    const maintenant = new Date().toISOString();
    const priorite = mapperPriorite(ligne.priorite);

    if (ligne.ruche === 'Toutes' && modeToutes === 'tache_rucher') {
      if (!ligne.echeance) {
        erreursResolution.push({
          numeroLigne: ligne.numeroLigne,
          motif: 'ligne "Toutes" sans échéance ignorée (mode tâche de niveau rucher)',
        });
        continue;
      }
      enregistrements.push({
        type: 'tache_seule',
        tache: {
          id: crypto.randomUUID(),
          colonie_id: null,
          rucher_id: rucher.id,
          libelle: ligne.actionEntreprise ?? ligne.observation ?? 'Tâche importée',
          date_echeance: ligne.echeance.toISOString(),
          priorite,
          origine: 'import_csv',
          statut: 'a_faire',
          created_at: maintenant,
          updated_at: maintenant,
          deleted_at: null,
        },
      });
      continue;
    }

    let coloniesCiblees;
    if (ligne.ruche === 'Toutes') {
      coloniesCiblees = colonies;
    } else if (ligne.ruche) {
      const ruche = rucheParNumero.get(ligne.ruche);
      const colonie = ruche ? colonieParRucheId.get(ruche.id) : null;
      coloniesCiblees = colonie ? [colonie] : [];
    } else {
      coloniesCiblees = [];
    }

    if (coloniesCiblees.length === 0) {
      erreursResolution.push({
        numeroLigne: ligne.numeroLigne,
        motif: `ruche "${ligne.ruche ?? '(vide)'}" introuvable`,
      });
      continue;
    }

    const observationLibre = construireObservationLibre(ligne);
    const dateIso = ligne.date.toISOString();

    for (const colonie of coloniesCiblees) {
      const visiteId = crypto.randomUUID();
      enregistrements.push({
        type: 'visite',
        visite: {
          id: visiteId,
          colonie_id: colonie.id,
          date: dateIso,
          heure: ligne.heure,
          type: ligne.type,
          nb_cadres_couvain_opercule: null,
          nb_cadres_couvain_ouvert: null,
          nb_cadres_provisions: null,
          population: null,
          reine_vue: null,
          oeufs_vus: null,
          anomalies: [],
          observation_libre: observationLibre,
          action_entreprise: ligne.actionEntreprise,
          priorite,
          provenance_champs: {
            observation_libre: observationLibre ? 'saisi' : 'vide',
            action_entreprise: ligne.actionEntreprise ? 'saisi' : 'vide',
          },
          created_at: maintenant,
          updated_at: maintenant,
          deleted_at: null,
        },
        tache: ligne.echeance
          ? {
              id: crypto.randomUUID(),
              colonie_id: colonie.id,
              rucher_id: rucher.id,
              libelle: ligne.actionEntreprise ?? ligne.observation ?? 'Tâche importée',
              date_echeance: ligne.echeance.toISOString(),
              priorite,
              origine: 'import_csv',
              statut: 'a_faire',
              visite_declencheuse_id: visiteId,
              created_at: maintenant,
              updated_at: maintenant,
              deleted_at: null,
            }
          : null,
      });
    }
  }

  return { enregistrements, erreursResolution };
}
