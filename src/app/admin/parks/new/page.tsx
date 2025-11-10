import { ParkSubmissionForm } from "@/components/forms/ParkSubmissionForm";

export default function AdminNewParkPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Create New Park
        </h1>
        <p className="text-gray-600">
          Add a new park to the database. Parks created here will be immediately
          approved.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <ParkSubmissionForm isAdminForm />
      </div>
    </div>
  );
}
