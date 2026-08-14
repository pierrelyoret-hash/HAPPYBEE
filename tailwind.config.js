// Jetons de design (brief refonte visuelle §4) — aucune valeur codée en
// dur ailleurs que dans ce fichier et src/styles/index.css.
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ground: 'var(--ground)',
        surface: 'var(--surface)',
        'surface-sunk': 'var(--surface-sunk)',
        ink: {
          DEFAULT: 'var(--ink)',
          secondary: 'var(--ink-secondary)',
          muted: 'var(--ink-muted)',
        },
        rule: {
          DEFAULT: 'var(--rule)',
          strong: 'var(--rule-strong)',
        },
        urgent: { bg: 'var(--urgent-bg)', ink: 'var(--urgent-ink)' },
        action: { bg: 'var(--action-bg)', ink: 'var(--action-ink)' },
        attente: { bg: 'var(--attente-bg)', ink: 'var(--attente-ink)' },
        normale: { bg: 'var(--normale-bg)', ink: 'var(--normale-ink)' },
        miel: 'var(--miel)',
        vert: 'var(--vert)',
        bordeaux: 'var(--bordeaux)',
      },
      fontFamily: {
        sans: ['Atkinson Hyperlegible', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      fontSize: {
        11: ['11px', '1.5'],
        12: ['12px', '1.5'],
        13: ['13px', '1.5'],
        15: ['15px', '1.5'],
        17: ['17px', '1.5'],
        20: ['20px', '1.25'],
        26: ['26px', '1.25'],
      },
      // L'échelle d'espacement par défaut de Tailwind (1→4px, 2→8px,
      // 3→12px, 4→16px, 6→24px, 8→32px) correspond déjà exactement à
      // l'échelle exclusive du brief refonte §4 — aucune surcharge nécessaire.
      borderRadius: {
        DEFAULT: '6px',
      },
    },
  },
  plugins: [],
};
