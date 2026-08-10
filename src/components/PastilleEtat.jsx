// Toujours couleur + libellé + icône — jamais la couleur seule
// (addendum ergonomie, règles d'affichage).
const CONFIG = {
  urgent: {
    icone: '!',
    libelle: 'Urgent',
    classe: 'bg-red-100 text-red-700 border-red-300',
  },
  action: {
    icone: '~',
    libelle: 'Action',
    classe: 'bg-amber-100 text-amber-700 border-amber-300',
  },
  a_visiter: {
    icone: '○',
    libelle: 'À visiter',
    classe: 'bg-gray-100 text-gray-700 border-gray-300',
  },
  normale: {
    icone: '✓',
    libelle: 'Normale',
    classe: 'bg-green-100 text-green-700 border-green-300',
  },
};

export function PastilleEtat({ etat }) {
  const config = CONFIG[etat] ?? CONFIG.normale;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium whitespace-nowrap ${config.classe}`}
    >
      <span aria-hidden="true">{config.icone}</span>
      {config.libelle}
    </span>
  );
}
