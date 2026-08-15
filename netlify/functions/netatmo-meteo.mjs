import { createClient } from '@supabase/supabase-js';

const URL_JETON = 'https://api.netatmo.com/oauth2/token';
const URL_STATIONS = 'https://api.netatmo.com/api/getstationsdata';
const LIGNE_ID = 'principal';

const LIBELLES_TYPE = {
  NAMain: 'Intérieur',
  NAModule1: 'Extérieur',
  NAModule2: 'Vent',
  NAModule3: 'Pluie',
  NAModule4: 'Intérieur (module)',
};

function clientAdmin() {
  return createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Netatmo fait tourner (RFC OAuth2) le refresh_token à chaque rafraîchissement
// depuis avril 2023 : l'ancien devient invalide, il faut réenregistrer le
// nouveau immédiatement. D'où le passage par Supabase plutôt qu'une simple
// variable d'environnement figée — cf. §19 du cahier des charges.
async function obtenirAccessToken(supabase) {
  const { data: ligne, error } = await supabase
    .from('netatmo_credentials')
    .select('*')
    .eq('id', LIGNE_ID)
    .single();
  if (error || !ligne) {
    throw new Error("Identifiants Netatmo introuvables en base (table netatmo_credentials vide).");
  }

  const expireBientot =
    !ligne.expire_a || new Date(ligne.expire_a).getTime() < Date.now() + 60_000;
  if (ligne.access_token && !expireBientot) {
    return ligne.access_token;
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: ligne.refresh_token,
    client_id: process.env.NETATMO_CLIENT_ID,
    client_secret: process.env.NETATMO_CLIENT_SECRET,
  });
  const reponse = await fetch(URL_JETON, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!reponse.ok) {
    throw new Error(`Échec du rafraîchissement du token Netatmo (HTTP ${reponse.status})`);
  }
  const jeton = await reponse.json();
  const expireA = new Date(Date.now() + jeton.expires_in * 1000).toISOString();

  const { error: erreurMaj } = await supabase
    .from('netatmo_credentials')
    .update({
      access_token: jeton.access_token,
      refresh_token: jeton.refresh_token,
      expire_a: expireA,
      updated_at: new Date().toISOString(),
    })
    .eq('id', LIGNE_ID);
  if (erreurMaj) {
    throw new Error("Échec de l'enregistrement du nouveau token en base.");
  }

  return jeton.access_token;
}

function extraireReleves(donneesStation) {
  const appareils = donneesStation.body?.devices ?? [];
  const modules = appareils.flatMap((a) => [a, ...(a.modules ?? [])]);
  return modules
    .filter((m) => m.dashboard_data)
    .map((m) => ({
      nom: m.module_name ?? LIBELLES_TYPE[m.type] ?? m.type,
      type: m.type,
      libelle: LIBELLES_TYPE[m.type] ?? m.type,
      donnees: m.dashboard_data,
      batterie: m.battery_percent ?? null,
      dernierMessage: m.last_seen ? new Date(m.last_seen * 1000).toISOString() : null,
    }));
}

export default async () => {
  try {
    const supabase = clientAdmin();
    const accessToken = await obtenirAccessToken(supabase);

    const reponse = await fetch(URL_STATIONS, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!reponse.ok) {
      throw new Error(`Échec de récupération des données station (HTTP ${reponse.status})`);
    }
    const donnees = await reponse.json();
    const releves = extraireReleves(donnees);

    if (releves.length === 0) {
      return new Response(JSON.stringify({ erreur: 'Aucune donnée de station disponible.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ releves }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[netatmo-meteo]', err);
    return new Response(JSON.stringify({ erreur: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const config = {
  path: '/api/netatmo-meteo',
};
