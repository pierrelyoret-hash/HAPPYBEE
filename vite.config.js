import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'HAPPYBEE',
        short_name: 'HAPPYBEE',
        description: 'Gestion apicole hors ligne — saisie de visite au rucher.',
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#FAFAF8',
        theme_color: '#1A1A17',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // woff/woff2 ajoutés avec les polices locales (brief refonte §4) —
        // sans précache, la typographie casserait hors-ligne après un
        // vidage du cache HTTP normal du navigateur.
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest,woff,woff2}'],
        // jsPDF (lot L2.2, export PDF sanitaire) n'est utilisé qu'en mode
        // texte (doc.text/.save) — jamais doc.html(). Cette API optionnelle
        // charge html2canvas + dompurify en import() dynamique et Rollup les
        // isole dans des chunks séparés ; comme ce code ne s'exécute jamais
        // ici, les précacher gonflerait le cache hors-ligne de ~380 Ko pour
        // rien (glob par préfixe de nom de chunk, stable tant que ces deux
        // paquets ne changent pas leur nommage de build).
        globIgnores: ['**/html2canvas.esm-*.js', '**/purify.es-*.js', '**/index.es-*.js'],
      },
    }),
  ],
});
