// Contenu réglementaire statique — brief L1+ §5. Écrit en dur : aucun
// calcul, aucune inférence, aucun appel à un modèle de langage. Ne jamais
// transformer ce texte en logique conditionnelle ou en sortie d'IA.
export function ParcoursCategorie1({ onContinuer }) {
  return (
    <div className="fixed inset-0 bg-white text-gray-900 overflow-y-auto z-50">
      <div className="p-4 flex flex-col gap-4 max-w-md mx-auto">
        <header>
          <h1 className="text-xl font-medium text-red-700">Suspicion de danger sanitaire de catégorie 1</h1>
          <p className="text-sm text-gray-700 mt-1">
            Quatre dangers sont classés en première catégorie en France : loque américaine,
            <i> Aethina tumida</i>, <i>Tropilaelaps</i>, nosémose à <i>Nosema apis</i>. Aucun
            traitement n'existe et l'usage d'antibiotiques est interdit.
          </p>
        </header>

        <section className="border border-red-300 bg-red-50 rounded p-3">
          <p className="text-sm font-medium mb-2">Conduite à tenir, dès maintenant :</p>
          <ul className="text-sm list-disc pl-5 flex flex-col gap-1">
            <li>Ne pas déplacer la ruche</li>
            <li>Ne réutiliser aucun cadre ni élément de matériel</li>
            <li>Isoler la colonie</li>
          </ul>
        </section>

        <section>
          <p className="text-sm font-medium mb-1">Déclaration obligatoire</p>
          <p className="text-sm text-gray-700">
            Toute suspicion doit être déclarée. Contacte un vétérinaire, un technicien sanitaire
            apicole (TSA) ou le GDS départemental.
          </p>
        </section>

        <section>
          <p className="text-sm font-medium mb-1">Prélèvement attendu</p>
          <p className="text-sm text-gray-700">
            Un morceau de couvain d'environ 10 × 10 cm, pour confirmation en laboratoire.
          </p>
        </section>

        <section>
          <p className="text-sm font-medium mb-1">Test de l'allumette — orientation seulement</p>
          <ul className="text-sm text-gray-700 list-disc pl-5 flex flex-col gap-1">
            <li>Filament gluant et élastique de plus de 2 cm, larve non extractible → oriente vers la loque américaine</li>
            <li>Masse pâteuse non filante → oriente vers la loque européenne</li>
          </ul>
        </section>

        <p className="text-[11px] text-gray-500">
          Cette application ne propose aucun traitement et ne pose aucun diagnostic. Le
          diagnostic de certitude relève du laboratoire.
        </p>

        <button
          type="button"
          onClick={onContinuer}
          className="h-[46px] w-full rounded bg-red-700 text-white text-base font-medium"
        >
          J'ai pris connaissance — poursuivre la visite
        </button>
      </div>
    </div>
  );
}
