import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Empty state for the list view — a calm invitation to contribute when a
 * completed load returns no parks. Keeps the plain "no matches" line, then
 * offers a low-key prompt to add a missing park via `/submit`.
 */
export function EmptyParksInvite() {
  return (
    <div className="py-16 text-center text-muted-foreground">
      <p>No parks match your filters.</p>
      <div className="mt-6 space-y-3">
        <p className="text-sm">
          Know an offroad park or trail system that isn&rsquo;t here? Add it to
          the map.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/submit">Submit a park</Link>
        </Button>
      </div>
    </div>
  );
}
