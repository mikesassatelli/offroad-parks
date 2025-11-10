import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export function useFavorites() {
  const { data: session } = useSession();
  const [favoriteParkIds, setFavoriteParkIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load favorites when user signs in
  useEffect(() => {
    if (session?.user) {
      loadFavorites();
    } else {
      setFavoriteParkIds([]);
    }
  }, [session?.user]);

  const loadFavorites = async () => {
    try {
      const response = await fetch("/api/favorites");
      if (response.ok) {
        const favorites = await response.json();
        // Extract slugs from the park objects (frontend uses slugs as IDs)
        setFavoriteParkIds(
          favorites.map((f: { park: { slug: string } }) => f.park.slug),
        );
      }
    } catch (error) {
      console.error("Failed to load favorites:", error);
    }
  };

  const toggleFavorite = async (parkId: string) => {
    if (!session?.user) {
      alert("Please sign in to save favorites");
      return;
    }

    const isFav = favoriteParkIds.includes(parkId);
    setIsLoading(true);

    try {
      if (isFav) {
        // Remove favorite
        const response = await fetch(`/api/favorites/${parkId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          setFavoriteParkIds((prev) => prev.filter((id) => id !== parkId));
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("Failed to remove favorite:", errorData);
          alert("Failed to remove favorite");
        }
      } else {
        // Add favorite
        const response = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parkId }),
        });

        if (response.ok) {
          setFavoriteParkIds((prev) => [...prev, parkId]);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("Failed to add favorite:", errorData);
          alert("Failed to add favorite");
        }
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      alert("Failed to update favorite");
    } finally {
      setIsLoading(false);
    }
  };

  const isFavorite = (parkId: string) => favoriteParkIds.includes(parkId);

  return {
    favoriteParkIds,
    toggleFavorite,
    isFavorite,
    isLoading,
  };
}
