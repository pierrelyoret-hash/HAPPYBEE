import { createClient } from '@supabase/supabase-js';

// Clé publique (sb_publishable_...) : faite pour être visible côté client,
// contrairement à la clé secrète qui ne doit jamais figurer ici.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

// Compte technique unique (lot L2, synchronisation) — pas un compte visible
// pour l'exploitant : l'appli s'y connecte via le code de jumelage entré une
// seule fois par appareil (voir Jumelage.jsx), jamais par un écran de login.
export const EMAIL_COMPTE_TECHNIQUE = 'pierre@happybee.local';
