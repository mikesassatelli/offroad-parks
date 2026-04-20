import { ParkSubmissionForm } from "@/components/forms/ParkSubmissionForm";

export default function AdminNewParkPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Create New Park
        </h1>
        <p className="text-muted-foreground">
          Add a new park to the database. Parks created here will be immediately
          approved.
        </p>
      </div>

      <div className="bg-card rounded-lg shadow border border-border p-6">
        <ParkSubmissionForm isAdminForm />
      </div>
    </div>
  );
}
