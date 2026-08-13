import { useEffect, useState } from 'react';
import { listerPhotosVisite } from '../db/repositories/photos.js';
import { obtenirUrlAffichagePhoto } from '../lib/sync.js';

// Affichage seul (l'ajout se fait à l'écran B) — utilisé dans l'historique
// et, plus tard, tout écran de relecture d'une visite déjà enregistrée.
export function PhotosVisite({ visiteId }) {
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    let annule = false;
    async function charger() {
      const liste = await listerPhotosVisite(visiteId);
      const avecUrl = await Promise.all(
        liste.map(async (photo) => ({ ...photo, url: await obtenirUrlAffichagePhoto(photo) }))
      );
      if (!annule) setPhotos(avecUrl.filter((p) => p.url));
    }
    charger();
    return () => {
      annule = true;
    };
  }, [visiteId]);

  if (photos.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {photos.map((photo) => (
        <img
          key={photo.id}
          src={photo.url}
          alt=""
          className="w-16 h-16 object-cover rounded border border-rule-strong"
        />
      ))}
    </div>
  );
}
