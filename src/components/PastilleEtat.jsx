// Fond et encre de la famille d'état (brief refonte visuelle §5) — jamais
// la couleur seule : le libellé porte l'information sur les quatre états,
// l'état urgent porte en plus une icône.
const CONFIG = {
  urgent: { icone: '!', libelle: 'Urgent', classe: 'bg-urgent-bg text-urgent-ink' },
  action: { icone: null, libelle: 'Action', classe: 'bg-action-bg text-action-ink' },
  a_visiter: { icone: null, libelle: 'À visiter', classe: 'bg-attente-bg text-attente-ink' },
  normale: { icone: null, libelle: 'Normale', classe: 'bg-normale-bg text-normale-ink' },
};

// `surFondTeinte` : la ligne de colonie urgente porte déjà le fond
// `--urgent-bg` (brief §5) — la pastille urgent y serait invisible avec sa
// propre teinte identique, donc elle passe en encre pleine sur fond blanc.
export function PastilleEtat({ etat, surFondTeinte = false }) {
  const config = CONFIG[etat] ?? CONFIG.normale;
  const classe = surFondTeinte && etat === 'urgent' ? 'bg-surface text-urgent-ink' : config.classe;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-11 font-bold whitespace-nowrap shrink-0 ${classe}`}
    >
      {config.icone && <span aria-hidden="true">{config.icone}</span>}
      {config.libelle}
    </span>
  );
}
