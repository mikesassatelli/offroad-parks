import { AppHeader } from "@/components/layout/AppHeader";

/**
 * Shared chrome for the legal pages: app header + a readable, centered
 * long-form content column. Styling is manual (no typography plugin in this
 * project), applied via the `.legal-prose` rules below.
 */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader showBackButton />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="legal-prose text-foreground [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:text-muted-foreground [&_p]:leading-7 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:text-muted-foreground [&_li]:mb-1 [&_a]:text-primary [&_a]:underline">
          {children}
        </div>
      </main>
    </div>
  );
}
