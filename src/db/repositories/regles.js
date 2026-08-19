import { db } from '../db.js';
import { CATALOGUE_REGLES_PAR_DEFAUT } from '../../lib/catalogueRegles.js';

// Insère les définitions par défaut manquantes uniquement — jamais un
// upsert complet : `active` et `parametres_utilisateur` sont modifiables
// par l'exploitant (F12.8/F12.9) et ne doivent pas être réécrasés à chaque
// démarrage de l'application. Une règle déjà présente (même code) n'est pas
// touchée, y compris si son contenu par défaut a changé depuis — une
// évolution de règle passe par une nouvelle `version`, pas une réécriture
// silencieuse (traçabilité, §5 du brief).
export async function initialiserCatalogue() {
  const maintenant = new Date().toISOString();
  for (const definition of CATALOGUE_REGLES_PAR_DEFAUT) {
    const existante = await db.regle.where('code').equals(definition.code).first();
    if (existante) continue;
    await db.regle.add({
      id: crypto.randomUUID(),
      ...definition,
      parametres_utilisateur: null,
      created_at: maintenant,
      updated_at: maintenant,
      deleted_at: null,
    });
  }
}

export async function listerReglesActives() {
  return db.regle.filter((r) => r.active && !r.deleted_at).toArray();
}

export async function obtenirRegle(code) {
  return db.regle.where('code').equals(code).first();
}

export async function modifierRegle(id, champs) {
  return db.regle.update(id, { ...champs, updated_at: new Date().toISOString() });
}
