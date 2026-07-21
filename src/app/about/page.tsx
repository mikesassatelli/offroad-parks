import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import {
  Compass,
  Map,
  MountainSnow,
  CloudSun,
  Star,
  ClipboardCheck,
  ShieldCheck,
  Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About · Offroad Parks",
  description:
    "Offroad Parks helps riders discover UTV and OHV-friendly parks, trails, terrain, and trail conditions — and gives operators the tools to keep their listing accurate.",
};

export default async function AboutPage() {
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

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero */}
        <section className="mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
            About
          </p>
          <h1 className="text-4xl font-extrabold text-foreground mb-4">
            The map for where to ride.
          </h1>
          <p className="text-lg text-muted-foreground leading-8 max-w-2xl">
            Offroad Parks is a free, community-driven guide to UTV and
            OHV-friendly parks across the United States. We bring the trails,
            terrain, amenities, current conditions, and honest rider reviews
            into one place — so you can spend less time guessing and more time
            riding.
          </p>
        </section>

        {/* What it is */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            What Offroad Parks is
          </h2>
          <p className="text-muted-foreground leading-7 mb-8 max-w-2xl">
            Finding a good place to ride usually means digging through scattered
            forum threads, outdated PDFs, and social posts. We pull that
            information together and keep it current, so every park page tells
            you what you actually need to know before you load up the trailer.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {[
              {
                icon: Compass,
                title: "Discover parks",
                body: "Browse UTV and OHV-friendly parks near you or anywhere in the country, with filters for the riding you want.",
              },
              {
                icon: Map,
                title: "Trails & routes",
                body: "See trail networks, difficulty, and rider-shared routes so you know what you're getting into.",
              },
              {
                icon: MountainSnow,
                title: "Terrain & amenities",
                body: "Understand the terrain, on-site amenities, and what each park offers before you go.",
              },
              {
                icon: CloudSun,
                title: "Conditions & weather",
                body: "Check current trail conditions and weather so a wasted trip doesn't sneak up on you.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-semibold text-foreground">{title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-6">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            How it works
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Star className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-semibold text-foreground">
                  For riders
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-6">
                Discovery and reviews are free, always. Find parks, read and
                leave reviews, share trail conditions, and save the routes you
                love. Your reports help the next rider know what to expect.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <ClipboardCheck className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-semibold text-foreground">
                  For operators
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-6">
                Park owners and operators can claim their park from its detail
                page to manage the listing, post real-time trail status, and
                reach riders who are actively planning where to go next.
              </p>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Why we built it
          </h2>
          <div className="space-y-5 max-w-2xl">
            <div className="flex gap-4">
              <ShieldCheck className="h-5 w-5 shrink-0 text-primary mt-0.5" />
              <p className="text-muted-foreground leading-7">
                <span className="font-semibold text-foreground">
                  Accurate &amp; current.
                </span>{" "}
                Bad information wastes a whole weekend. We combine community
                reporting with operator-managed listings to keep park details
                trustworthy.
              </p>
            </div>
            <div className="flex gap-4">
              <Users className="h-5 w-5 shrink-0 text-primary mt-0.5" />
              <p className="text-muted-foreground leading-7">
                <span className="font-semibold text-foreground">
                  Built for the community.
                </span>{" "}
                Every review, trail-condition report, and shared route makes the
                map better for the next rider.
              </p>
            </div>
            <div className="flex gap-4">
              <Compass className="h-5 w-5 shrink-0 text-primary mt-0.5" />
              <p className="text-muted-foreground leading-7">
                <span className="font-semibold text-foreground">
                  Free to explore.
                </span>{" "}
                Discovering where to ride should never be behind a paywall. It
                isn&apos;t here, and it won&apos;t be.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-2xl border border-border bg-card p-8 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Ready to find your next ride?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Browse parks near you, or if you run a park, claim your listing to
            reach riders.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/">Browse parks</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/for-operators">For operators</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
