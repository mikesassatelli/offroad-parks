import Link from "next/link";

/**
 * Global site footer. Provides always-available links to the legal pages
 * (required for the Google OAuth consent screen and general trust) plus a few
 * primary navigation destinations.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card/50 mt-8">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/"
            className="text-sm font-extrabold uppercase tracking-widest text-foreground hover:text-primary transition-colors"
          >
            Offroad Parks
          </Link>
          <p className="text-xs text-muted-foreground mt-1">
            Find UTV-friendly parks and trails across the U.S.
          </p>
        </div>

        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground"
        >
          <Link
            href="/reviews"
            className="hover:text-foreground transition-colors"
          >
            Reviews
          </Link>
          <Link
            href="/submit"
            className="hover:text-foreground transition-colors"
          >
            Submit a Park
          </Link>
          <Link
            href="/legal/privacy"
            className="hover:text-foreground transition-colors"
          >
            Privacy
          </Link>
          <Link
            href="/legal/terms"
            className="hover:text-foreground transition-colors"
          >
            Terms
          </Link>
        </nav>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-6">
        <p className="text-xs text-muted-foreground">
          © {year} Offroad Parks. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
