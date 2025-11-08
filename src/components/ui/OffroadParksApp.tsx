"use client";
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MapPin, Star, StarOff, Filter } from "lucide-react";
import type { Amenity, Terrain, Park } from "@/lib/types";
import { PARKS } from "@/data/parks";

function formatCurrency(v?: number) { return typeof v === "number" ? `$${v.toFixed(0)}` : "—"; }

const allAmenities: Amenity[] = ["camping", "showers", "rv hookups", "fuel", "wash station", "restaurant", "rentals", "trail maps"];
const allTerrain: Terrain[] = ["sand", "mud", "hardpack", "rocky", "desert", "forest", "hills", "mountain"];

export default function UtvParksApp() {
  const [q, setQ] = useState("");
  const [stateFilter, setStateFilter] = useState<string | undefined>();
  const [terrainFilter, setTerrainFilter] = useState<string | undefined>();
  const [amenityFilter, setAmenityFilter] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<"name" | "price" | "miles">("name");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [active, setActive] = useState<Park | null>(null);

  const states = useMemo(() => Array.from(new Set(PARKS.map(p => p.state))).sort(), []);

  const parks = useMemo(() => {
    let list = [...PARKS];
    if (q.trim()) {
      const term = q.toLowerCase();
      list = list.filter(p => [p.name, p.city, p.state, p.notes].filter(Boolean).some(v => v!.toLowerCase().includes(term)));
    }
    if (stateFilter) list = list.filter(p => p.state === stateFilter);
    if (terrainFilter) list = list.filter(p => p.terrain.includes(terrainFilter as Terrain));
    if (amenityFilter) list = list.filter(p => p.amenities.includes(amenityFilter as Amenity));
    list.sort((a,b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "price") return (a.dayPassUSD ?? Infinity) - (b.dayPassUSD ?? Infinity);
      if (sortBy === "miles") return (b.milesOfTrails ?? 0) - (a.milesOfTrails ?? 0);
      return 0;
    });
    return list;
  }, [q, stateFilter, terrainFilter, amenityFilter, sortBy]);

  const toggleFav = (id: string) => setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="text-2xl font-bold tracking-tight">UTV Parks</div>
          <span className="ml-1 inline-flex items-center text-xs px-2 py-1 rounded-full bg-gray-100 border">beta</span>
          <div className="ml-auto flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <Select onValueChange={v => setSortBy(v as any)} value={sortBy}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Sort" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name (A–Z)</SelectItem>
                <SelectItem value="price">Lowest Day Pass</SelectItem>
                <SelectItem value="miles">Most Trail Miles</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-4 gap-4 items-start">
          <div className="md:col-span-1 bg-white p-4 rounded-2xl shadow-sm border">
            <div className="text-sm font-semibold mb-2">Search</div>
            <Input placeholder="Search by name, city, state…" value={q} onChange={e => setQ(e.target.value)} />
            <div className="h-px bg-gray-200 my-4" />
            <div className="text-sm font-semibold mb-2">State</div>
            <Select onValueChange={v => setStateFilter(v === "__all" ? undefined : v)} value={stateFilter}>
              <SelectTrigger><SelectValue placeholder="All states" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All</SelectItem>
                {states.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
            <div className="mt-4 text-sm font-semibold mb-2">Terrain</div>
            <Select onValueChange={v => setTerrainFilter(v === "__all" ? undefined : v)} value={terrainFilter}>
            <SelectTrigger><SelectValue placeholder="Any terrain" /></SelectTrigger>
            <SelectContent>
                <SelectItem value="__all">Any</SelectItem>
                {allTerrain.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
            </Select>
            <div className="mt-4 text-sm font-semibold mb-2">Amenities</div>
            <Select onValueChange={v => setAmenityFilter(v === "__all" ? undefined : v)} value={amenityFilter}>
            <SelectTrigger><SelectValue placeholder="Any amenity" /></SelectTrigger>
            <SelectContent>
                <SelectItem value="__all">Any</SelectItem>
                {allAmenities.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
            </Select>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" onClick={() => {setQ(""); setStateFilter(undefined); setTerrainFilter(undefined); setAmenityFilter(undefined);}}>Reset</Button>
            </div>
            <div className="mt-6 text-xs text-gray-500">Tip: Star favorites to plan a weekend loop.</div>
          </div>

          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {parks.map(p => (
              <Card key={p.id} className="rounded-2xl border shadow-sm hover:shadow-md transition" onClick={() => setActive(p)}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="leading-tight text-lg">{p.name}</CardTitle>
                    <Button size="icon" variant={favorites.includes(p.id) ? "default" : "secondary"} onClick={(e) => { e.stopPropagation(); toggleFav(p.id); }}>
                      {favorites.includes(p.id) ? <Star className="w-4 h-4" /> : <StarOff className="w-4 h-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <MapPin className="w-4 h-4" />
                    <span>{p.city ? `${p.city}, ` : ""}{p.state}</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {p.terrain.map(t => (<Badge key={t} variant="outline" className="capitalize">{t}</Badge>))}
                  </div>
                  <div className="text-sm text-gray-700 grid grid-cols-2 gap-y-1">
                    <div><span className="text-gray-500">Trail miles:</span> {p.milesOfTrails ?? "—"}</div>
                    <div><span className="text-gray-500">Day pass:</span> {formatCurrency(p.dayPassUSD)}</div>
                    <div><span className="text-gray-500">Acres:</span> {p.acres ?? "—"}</div>
                    <div><span className="text-gray-500">UTV allowed:</span> {p.utvAllowed ? "Yes" : "No"}</div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {p.amenities.map(a => (<Badge key={a} className="capitalize" variant="secondary">{a}</Badge>))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <Dialog open={!!active} onOpenChange={() => setActive(null)}>
        <DialogContent className="max-w-xl">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>{active.name}</DialogTitle>
                <DialogDescription>
                  {active.city ? `${active.city}, ` : ""}{active.state} · {active.milesOfTrails ?? "—"} mi trails · {formatCurrency(active.dayPassUSD)} day pass
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                {active.notes && <p className="text-gray-700">{active.notes}</p>}
                {active.website && (
                  <p>
                    <a href={active.website} target="_blank" rel="noreferrer" className="underline">Official site</a>
                  </p>
                )}
                {active.phone && <p>Phone: {active.phone}</p>}
                <div className="flex flex-wrap gap-1">
                  {active.terrain.map(t => (<Badge key={t} variant="outline" className="capitalize">{t}</Badge>))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {active.amenities.map(a => (<Badge key={a} className="capitalize" variant="secondary">{a}</Badge>))}
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">Always verify hours, passes, and vehicle regulations before visiting.</div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}