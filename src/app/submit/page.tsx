import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ParkSubmissionForm } from "@/components/forms/ParkSubmissionForm";
import Link from "next/link";

export default async function SubmitParkPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/api/auth/signin?callbackUrl=/submit");
  }

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

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Submit a Park
          </h1>
          <p className="text-muted-foreground">
            Help the community by adding a new offroad park. Your submission
            will be reviewed by our team before being published.
          </p>
        </div>

        <div className="bg-card rounded-lg shadow border border-border p-6">
          <ParkSubmissionForm />
        </div>
      </main>
    </div>
  );
}
