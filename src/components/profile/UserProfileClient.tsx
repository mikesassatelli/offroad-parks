"use client";

import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import type { Park } from "@/lib/types";
import { ParkCard } from "@/components/parks/ParkCard";
import { ParkDetailsDialog } from "@/components/parks/ParkDetailsDialog";
import { useFavorites } from "@/hooks/useFavorites";
import { Heart, User } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface UserProfileClientProps {
  parks: Park[];
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

function UserProfileInner({ parks, user }: UserProfileClientProps) {
  const [selectedPark, setSelectedPark] = useState<Park | null>(null);
  const { toggleFavorite, isFavorite } = useFavorites();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center gap-3">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight text-foreground hover:text-primary transition-colors"
          >
            🏞️ UTV Parks
          </Link>
          <span className="ml-1 inline-flex items-center text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
            beta
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || "User"}
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {user.name || "My Profile"}
              </h1>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-semibold text-foreground">
              My Favorites
            </h2>
            <span className="text-sm text-muted-foreground">
              ({parks.length} park{parks.length !== 1 ? "s" : ""})
            </span>
          </div>

          {parks.length === 0 ? (
            <div className="bg-card rounded-lg shadow border border-border p-12 text-center">
              <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No favorites yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Start exploring parks and add them to your favorites!
              </p>
              <Button asChild>
                <Link href="/">Browse Parks</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {parks.map((park) => (
                <ParkCard
                  key={park.id}
                  park={park}
                  isFavorite={isFavorite(park.id)}
                  onToggleFavorite={toggleFavorite}
                  onCardClick={setSelectedPark}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <ParkDetailsDialog
        park={selectedPark}
        isOpen={!!selectedPark}
        onClose={() => setSelectedPark(null)}
      />
    </div>
  );
}

export function UserProfileClient(props: UserProfileClientProps) {
  return (
    <SessionProvider>
      <UserProfileInner {...props} />
    </SessionProvider>
  );
}
