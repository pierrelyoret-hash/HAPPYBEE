import { db } from './db/db.js';
import { seedDemoData } from './db/seed.js';

window.db = db; // pour inspection manuelle depuis la console

async function verifier() {
  await seedDemoData();

  const ruchers = await db.rucher.toArray();
  const ruches = await db.ruche.toArray();
  const colonies = await db.colonie.toArray();
  const reines = await db.reine.toArray();

  console.log('--- Vérification étape 1 ---');
  console.log('Ruchers :', ruchers);
  console.log('Ruches :', ruches);
  console.log('Colonies :', colonies);
  console.log('Reines :', reines);

  const ruche3 = ruches.find((r) => r.numero === 3);
  const colonieRuche3 = colonies.find((c) => c.ruche_id === ruche3.id);
  const reineRuche3 = reines.find((r) => r.colonie_id === colonieRuche3.id);
  console.log(
    'Colonie ruche 3 — attendu "active" sans reine :',
    colonieRuche3.statut,
    reineRuche3 ? 'reine présente (ERREUR)' : 'aucune reine (OK)'
  );
}

verifier().catch((err) => console.error('[étape 1] échec de la vérification', err));
