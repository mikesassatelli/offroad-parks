import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { AppHeader } from "@/components/layout/AppHeader";
import { LEGAL } from "@/lib/legal";
import { Button } from "@/components/ui/button";
import { Mail, MapPinned, Flag, Building2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact · Offroad Parks",
  description:
    "Get in touch with Offroad Parks — claim or manage a park, report a data problem, or ask about operator tools.",
};

export default async function ContactPage() {
  const session = await auth();
  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: (session.user as { role?: string }).role,
      }
    : null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} showBackButton />

      <main className="max-w-3xl mx-auto px-6 py-12">
        <section className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
            Contact
          </p>
          <h1 className="text-4xl font-extrabold text-foreground mb-4">
            Get in touch
          </h1>
          <p className="text-lg text-muted-foreground leading-8">
            We&apos;re a small team and we read everything. The fastest way to
            reach us is email — but check the guidance below first, since a few
            common requests are handled right in the app.
          </p>
        </section>

        {/* Email */}
        <section className="mb-10 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Mail className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-bold text-foreground">Email us</h2>
          </div>
          <p className="text-muted-foreground leading-7 mb-5">
            Questions, feedback, corrections, or partnership ideas — send them
            our way and we&apos;ll get back to you.
          </p>
          <Button asChild size="lg">
            <a href={`mailto:${LEGAL.contactEmail}`}>
              <Mail className="h-4 w-4" />
              {LEGAL.contactEmail}
            </a>
          </Button>
        </section>

        {/* Guidance blocks */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold text-foreground">
            Before you write
          </h2>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <MapPinned className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">
                Claim or manage a park
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-6">
              You don&apos;t need to email us to manage a listing. Open your
              park&apos;s page from{" "}
              <Link href="/" className="text-primary underline">
                Browse parks
              </Link>{" "}
              and click &ldquo;Claim this park.&rdquo; Once verified, you can
              update details and post trail status yourself.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <Flag className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">
                Report a data problem
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-6">
              Spot wrong hours, a closed park, or bad trail info? Email us at{" "}
              <a
                href={`mailto:${LEGAL.contactEmail}`}
                className="text-primary underline"
              >
                {LEGAL.contactEmail}
              </a>{" "}
              with the park name and what&apos;s off, and we&apos;ll fix it.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">
                Operator inquiries
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-6">
              Run a park and want to know what claiming gets you? See{" "}
              <Link href="/for-operators" className="text-primary underline">
                For operators
              </Link>{" "}
              for the full rundown, then claim your park to get started.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
