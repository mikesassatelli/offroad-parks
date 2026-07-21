import Link from "next/link";

/**
 * Global site footer. Provides always-available links to the legal pages
 * (required for the Google OAuth consent screen and general trust) plus
 * grouped navigation to the app's primary destinations.
 */
const FOOTER_SECTIONS: {
  heading: string;
  links: { href: string; label: string }[];
}[] = [
  {
    heading: "Explore",
    links: [
      { href: "/", label: "Browse parks" },
      { href: "/reviews", label: "Reviews" },
      { href: "/routes", label: "Routes" },
      { href: "/submit", label: "Submit a park" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/for-operators", label: "For operators" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/legal/privacy", label: "Privacy" },
      { href: "/legal/terms", label: "Terms" },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card/50 mt-8">
      <div className="max-w-7xl mx-auto px-6 py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link
            href="/"
            className="text-sm font-extrabold uppercase tracking-widest text-foreground hover:text-primary transition-colors"
          >
            Offroad Parks
          </Link>
          <p className="text-xs text-muted-foreground mt-2 max-w-xs">
            Find UTV-friendly parks and trails across the U.S.
          </p>
        </div>

        {FOOTER_SECTIONS.map((section) => (
          <nav key={section.heading} aria-label={section.heading}>
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">
              {section.heading}
            </h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <p className="text-xs text-muted-foreground">
            © {year} Offroad Parks. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
