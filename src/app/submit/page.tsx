import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ParkSubmissionForm } from "@/components/forms/ParkSubmissionForm";
import { SubmitParkClient } from "./SubmitParkClient";

export default async function SubmitParkPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/api/auth/signin?callbackUrl=/submit");
  }

  const user = {
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    role: (session.user as { role?: string }).role,
  };

  return (
    <SubmitParkClient user={user}>
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
    </SubmitParkClient>
  );
}
