import React from 'react';
import ReactDOM from 'react-dom/client';
import { db } from './db/db.js';
import { App } from './App.jsx';
import { Jumelage } from './features/jumelage/Jumelage.jsx';
import './styles/index.css';

window.db = db; // pour inspection manuelle depuis la console

// seedDemoData() (src/db/seed.js) n'est plus appelé automatiquement depuis
// le lot L2 : sur un appareil neuf, IndexedDB est vide avant le jumelage,
// et lancer le seed à ce moment-là crée un faux rucher "Dompierre-les-Ormes"
// avec de nouveaux id — qui se synchronise ensuite comme s'il s'agissait de
// vraies données. Bug constaté et corrigé le 12/08/2026 : le seed avait
// pollué la base Supabase réelle avec deux ruchers fantômes. Le fichier
// reste disponible pour un jeu de données de test manuel (window.db depuis
// la console), mais ne doit plus jamais s'exécuter au démarrage.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Jumelage>
      <App />
    </Jumelage>
  </React.StrictMode>
);
