import React from 'react';
import ReactDOM from 'react-dom/client';
import { db } from './db/db.js';
import { seedDemoData } from './db/seed.js';
import { App } from './App.jsx';
import './styles/index.css';

window.db = db; // pour inspection manuelle depuis la console

async function demarrer() {
  await seedDemoData();
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

demarrer().catch((err) => console.error('[démarrage]', err));
