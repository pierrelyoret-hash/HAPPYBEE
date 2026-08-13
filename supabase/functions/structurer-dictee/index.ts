// Reste de L2, L2.6 "Structuration IA de la dictée vers les champs" (F9.2).
// Proxy côté serveur : la clé Anthropic ne doit jamais atteindre le
// navigateur (§3.3 "IA | API Anthropic, appel depuis l'application" — mais
// l'application est une PWA statique sans serveur à elle, donc l'appel se
// fait ici, dans la seule pièce "serveur" de l'architecture). Le secret
// ANTHROPIC_API_KEY est configuré côté Supabase (dashboard ou CLI), jamais
// dans le dépôt ni dans .env.local (qui serait embarqué dans le bundle
// client par Vite).
//
// Authentification : verify_jwt reste activé (config.toml) — seul
// l'appareil jumelé peut appeler cette fonction, pas n'importe qui sur
// internet.
//
// F9.5 "Toute proposition de l'IA est soumise à validation explicite ;
// aucune écriture directe en base" : cette fonction ne fait qu'extraire et
// renvoyer des champs proposés — jamais d'écriture Supabase ici. L'écran de
// revue de tournée (côté client) reste seul responsable de l'enregistrement,
// après relecture par l'exploitant.

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const MODELE = 'claude-sonnet-5';

const ANOMALIES_VALIDES = [
  'bourdonneuse',
  'orpheline',
  'pillage',
  'fausse_teigne',
  'mortalite_anormale',
  'diarrhee',
  'abeilles_tremblantes',
  'ponte_males',
  'autre',
];

const VOIES_VALIDES = ['laniere', 'sublimation', 'degouttement', 'autre'];
const TYPES_NOURRISSEMENT_VALIDES = ['sirop_leger', 'sirop_lourd', 'candi', 'pate_proteique'];

// Schéma de l'outil = champs `visite` (cahier des charges §4.2) + entrées
// sanitaires ponctuelles (traitement/nourrissement, L2.2) que la dictée
// mentionne naturellement dans le même souffle qu'une visite ("je traite,
// je nourris..."). Constaté le 13/08/2026 : une dictée réelle contenant un
// traitement varroa n'était captée nulle part avant cet ajout — ni dans les
// champs de visite ni ailleurs. Le modèle est forcé à cet appel d'outil :
// sortie toujours structurée, jamais de texte libre à re-parser.
const OUTIL_STRUCTURATION = {
  name: 'proposer_champs_visite',
  description:
    "Propose les champs d'une visite, ainsi que les traitements et nourrissements mentionnés, extraits d'une dictée apicole — pour validation par l'exploitant.",
  input_schema: {
    type: 'object',
    properties: {
      nb_cadres_couvain_opercule: { type: ['integer', 'null'] },
      nb_cadres_provisions: { type: ['integer', 'null'] },
      population: { type: ['integer', 'null'], minimum: 1, maximum: 5 },
      reine_vue: { type: ['boolean', 'null'] },
      oeufs_vus: { type: ['boolean', 'null'] },
      temperament: { type: ['integer', 'null'], minimum: 1, maximum: 5 },
      batisse: { type: ['integer', 'null'], minimum: 1, maximum: 5 },
      score_ponte: { type: ['integer', 'null'], minimum: 0, maximum: 5 },
      anomalies: { type: 'array', items: { type: 'string', enum: ANOMALIES_VALIDES } },
      observation_libre: {
        type: ['string', 'null'],
        description: "Ce qui n'a pas pu être rattaché à un champ ci-dessus, texte tel quel.",
      },
      traitements: {
        type: 'array',
        description: 'Un élément par traitement sanitaire mentionné (varroa ou autre).',
        items: {
          type: 'object',
          properties: {
            produit: { type: ['string', 'null'], description: 'Nom du produit, tel que dit.' },
            voie: { type: ['string', 'null'], enum: [...VOIES_VALIDES, null] },
            dosage: { type: ['string', 'null'] },
            motif: { type: ['string', 'null'] },
          },
        },
      },
      nourrissements: {
        type: 'array',
        description: 'Un élément par nourrissement mentionné.',
        items: {
          type: 'object',
          properties: {
            type: { type: ['string', 'null'], enum: [...TYPES_NOURRISSEMENT_VALIDES, null] },
            quantite: { type: ['number', 'null'] },
            unite: { type: ['string', 'null'] },
            composition: {
              type: ['string', 'null'],
              description: 'Ex. "50-50", tel que dit — même si déjà couvert par le type.',
            },
          },
        },
      },
    },
    required: [],
  },
};

const INSTRUCTIONS_SYSTEME = `Tu extrais des champs structurés depuis la dictée d'un apiculteur en tournée de rucher, en français.

Règles impératives :
- N'invente jamais une valeur non dite. Un champ non mentionné reste null (ou absent des tableaux) — ne jamais déduire ou estimer, même à partir de ta connaissance générale du produit ou de la pratique (ex. si un traitement est cité sans préciser la voie d'administration, voie reste null — ne complète pas avec la voie habituelle de ce produit).
- Aucun diagnostic, aucune suggestion, aucune recommandation de conduite. Tu extrais ce qui a été dit et décidé, tu ne conseilles rien.
- Les huitièmes/fractions orales ("un quart de cadre", "la moitié") se convertissent en nombre de cadres si le nombre total de cadres concernés est explicite dans la phrase — sinon laisse le champ null plutôt que de deviner.
- "Sirop 50-50" ou équivalent proportion égale sucre/eau = sirop_leger ; une proportion plus concentrée (ex. 70-30, "sirop épais") = sirop_lourd. En cas de doute, laisse le type null et garde la proportion dans composition.
- Le texte qui ne correspond à aucun champ (observations qualitatives, contexte) va dans observation_libre, mot pour mot autant que possible.
- Réponds uniquement via l'appel de l'outil proposer_champs_visite.`;

// Le navigateur envoie un préflight OPTIONS avant tout POST cross-origin
// (localhost/Netlify → *.supabase.co) — sans réponse explicite ici, le
// préflight tombait sur le même traitement que les vraies requêtes et
// renvoyait 405, ce que le navigateur interprète comme un échec CORS et
// bloque la requête réelle avant même de l'envoyer (constaté le 13/08/2026).
const EN_TETES_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: EN_TETES_CORS });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: EN_TETES_CORS });
  }
  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY non configurée' }), {
      status: 500,
      headers: { ...EN_TETES_CORS, 'Content-Type': 'application/json' },
    });
  }

  let texte;
  try {
    const corps = await req.json();
    texte = corps.texte;
  } catch {
    return new Response(JSON.stringify({ error: 'Corps de requête invalide' }), {
      status: 400,
      headers: { ...EN_TETES_CORS, 'Content-Type': 'application/json' },
    });
  }

  if (!texte || typeof texte !== 'string' || texte.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Champ "texte" requis' }), {
      status: 400,
      headers: { ...EN_TETES_CORS, 'Content-Type': 'application/json' },
    });
  }

  const reponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODELE,
      max_tokens: 1024,
      system: INSTRUCTIONS_SYSTEME,
      tools: [OUTIL_STRUCTURATION],
      tool_choice: { type: 'tool', name: 'proposer_champs_visite' },
      messages: [{ role: 'user', content: texte }],
    }),
  });

  if (!reponse.ok) {
    const detail = await reponse.text();
    console.error('[structurer-dictee] échec appel Anthropic', reponse.status, detail);
    // Détail temporairement exposé dans la réponse pour diagnostiquer
    // (aucun secret dedans, juste le message d'erreur d'Anthropic) — à
    // retirer une fois que ça fonctionne.
    return new Response(
      JSON.stringify({ error: 'Échec de la structuration IA', statutAnthropic: reponse.status, detail }),
      {
        status: 502,
        headers: { ...EN_TETES_CORS, 'Content-Type': 'application/json' },
      }
    );
  }

  const donnees = await reponse.json();
  const appelOutil = donnees.content?.find((bloc) => bloc.type === 'tool_use');
  if (!appelOutil) {
    return new Response(JSON.stringify({ error: "Réponse IA sans structuration exploitable" }), {
      status: 502,
      headers: { ...EN_TETES_CORS, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ champs: appelOutil.input }), {
    headers: { ...EN_TETES_CORS, 'Content-Type': 'application/json' },
  });
});
