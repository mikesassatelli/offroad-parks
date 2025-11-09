import { useState } from "react";

export function useFavorites() {
  const [favoriteParkIds, setFavoriteParkIds] = useState<string[]>([]);

  const toggleFavorite = (parkId: string) => {
    setFavoriteParkIds((previousFavorites) =>
      previousFavorites.includes(parkId)
        ? previousFavorites.filter((id) => id !== parkId)
        : [...previousFavorites, parkId],
    );
  };

  const isFavorite = (parkId: string) => favoriteParkIds.includes(parkId);

  return {
    favoriteParkIds,
    toggleFavorite,
    isFavorite,
  };
}
