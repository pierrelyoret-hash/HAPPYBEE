import { supabase } from './supabase.js';

// Appelle la fonction Edge Supabase (structuration IA, L2.6) — jamais
// d'appel direct à l'API Anthropic depuis le navigateur, la clé resterait
// exposée dans le bundle client sinon.
export async function structurerDictee(texte) {
  const { data, error } = await supabase.functions.invoke('structurer-dictee', {
    body: { texte },
  });
  if (error) {
    console.error('[structuration IA] échec', error);
    throw error;
  }
  return data.champs;
}
