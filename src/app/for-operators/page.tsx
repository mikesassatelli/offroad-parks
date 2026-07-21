import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import {
  Radio,
  PencilRuler,
  Megaphone,
  FileSignature,
  Ticket,
  MapPin,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "For Operators · Offroad Parks",
  description:
    "Claim your park on Offroad Parks to manage your listing, post real-time trail status, and reach riders actively planning their next trip — for free.",
};

export default async function ForOperatorsPage() {
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
        <section className="mb-16 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
            For operators
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground mb-5 leading-tight">
            Put your park in front of riders.
          </h1>
          <p className="text-lg text-muted-foreground leading-8 max-w-2xl mx-auto mb-8">
            Riders come to Offroad Parks to decide where to ride next. Claim
            your park to control your listing, share what&apos;s open today, and
            get discovered by the people already looking for a place like yours.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/">
                Claim your park
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/contact">Talk to us</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Free to claim. No credit card required.
          </p>
        </section>

        {/* Value props */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
            Why claim your park
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Radio,
                title: "Real-time trail status",
                body: "Post open/closed status and trail conditions the moment they change. Cut down on the calls asking whether you're open after rain.",
              },
              {
                icon: PencilRuler,
                title: "Keep your listing accurate",
                body: "Own your hours, amenities, terrain, pricing, and photos so riders always see the right information — not stale forum posts.",
              },
              {
                icon: Megaphone,
                title: "Free marketing & discovery",
                body: "Get surfaced to riders actively searching for parks in your area. Reviews and exposure that bring new customers to your gate.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-card p-6"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15 text-primary mb-4">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-6">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Coming soon */}
        <section className="mb-16">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/15 border border-primary/25 rounded-md px-2 py-0.5">
                Coming soon
              </span>
              <h2 className="text-xl font-bold text-foreground">
                More operator tools on the way
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex gap-4">
                <FileSignature className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Digital waivers
                  </h3>
                  <p className="text-sm text-muted-foreground leading-6">
                    Let riders sign your waiver online before they arrive — no
                    clipboard at the gate.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Ticket className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Day-pass ticketing
                  </h3>
                  <p className="text-sm text-muted-foreground leading-6">
                    Sell day passes directly from your listing and manage
                    entries without extra software.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How to claim */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            How to claim your park
          </h2>
          <ol className="space-y-4 max-w-2xl mx-auto">
            {[
              {
                step: "1",
                title: "Find your park",
                body: "Head to Browse parks and search for your park by name or location.",
              },
              {
                step: "2",
                title: "Click “Claim this park”",
                body: "Open your park's detail page and use the claim button to start verification.",
              },
              {
                step: "3",
                title: "Manage your listing",
                body: "Once verified, update details and post trail status any time.",
              },
            ].map(({ step, title, body }) => (
              <li
                key={step}
                className="flex gap-4 rounded-xl border border-border bg-card p-5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  {step}
                </span>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-6">
                    {body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Final CTA */}
        <section className="rounded-2xl border border-border bg-primary/10 p-8 text-center">
          <MapPin className="h-8 w-8 text-primary mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Your park is probably already listed.
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Find it on Offroad Parks and click &ldquo;Claim this park&rdquo; to
            take control of your listing — it&apos;s free.
          </p>
          <Button asChild size="lg">
            <Link href="/">
              Claim your park
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
