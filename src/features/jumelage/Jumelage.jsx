import { useEffect, useState } from 'react';
import { supabase, EMAIL_COMPTE_TECHNIQUE } from '../../lib/supabase.js';
import { demarrerSyncAutomatique } from '../../lib/sync.js';

// Jumelage à usage unique par appareil (lot L2, synchronisation). Pas un
// écran de login au sens habituel : aucun compte visible pour l'exploitant,
// aucune donnée personnelle demandée. Le code entré une fois établit une
// session Supabase que le navigateur conserve indéfiniment (localStorage) —
// cet écran ne se réaffiche plus ensuite, sauf si le stockage du navigateur
// est effacé.
const CLE_REPORT = 'happybee_jumelage_reporte';

export function Jumelage({ children }) {
  const [sessionPresente, setSessionPresente] = useState(null); // null = vérification en cours
  const [reporte, setReporte] = useState(() => localStorage.getItem(CLE_REPORT) === '1');
  const [code, setCode] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessionPresente(!!data.session);
      if (data.session) demarrerSyncAutomatique();
    });
    const { data: abonnement } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionPresente(!!session);
      if (session) {
        localStorage.removeItem(CLE_REPORT);
        setReporte(false);
        demarrerSyncAutomatique();
      }
    });
    return () => abonnement.subscription.unsubscribe();
  }, []);

  function reporterJumelage() {
    localStorage.setItem(CLE_REPORT, '1');
    setReporte(true);
  }

  async function valider(e) {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: EMAIL_COMPTE_TECHNIQUE,
      password: code,
    });
    setEnCours(false);
    if (error) {
      setErreur(
        navigator.onLine
          ? 'Code de jumelage incorrect.'
          : 'Pas de réseau — le jumelage initial nécessite une connexion, une seule fois.'
      );
    }
  }

  if (sessionPresente === null) return null;
  if (sessionPresente || reporte) return children;

  return (
    <div className="min-h-screen bg-ground text-ink p-4 flex flex-col justify-center gap-4 max-w-md mx-auto">
      <header>
        <h1 className="text-20 font-bold">Jumeler cet appareil</h1>
        <p className="text-13 text-ink-secondary mt-1">
          À faire une seule fois par téléphone ou ordinateur, pour activer la synchronisation.
        </p>
      </header>
      <form onSubmit={valider} className="flex flex-col gap-3">
        <input
          type="password"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code de jumelage"
          className="h-12 border border-rule-strong rounded px-3 text-15 bg-surface text-ink"
        />
        {erreur && <p className="text-13 text-urgent-ink">{erreur}</p>}
        <button
          type="submit"
          disabled={enCours || !code}
          className="h-[46px] w-full rounded bg-ink text-surface text-15 font-bold disabled:opacity-50"
        >
          {enCours ? 'Vérification…' : 'Valider'}
        </button>
      </form>
      {/* Le hors-ligne est l'état normal, jamais bloquant (addendum
          ergonomie §2.7) : la saisie ne doit jamais attendre un jumelage. */}
      <button
        type="button"
        onClick={reporterJumelage}
        className="text-13 text-ink-secondary underline"
      >
        Continuer sans synchroniser pour l'instant
      </button>
    </div>
  );
}
