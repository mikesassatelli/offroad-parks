// TODO OP-84: Field Conflict Resolution UI
// When multiple sources disagree on a field value, surface conflicts
// in review queue with side-by-side source comparison.

export default function ConflictsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Field Conflicts
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Review and resolve conflicting field values from multiple sources.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="text-gray-400 text-4xl mb-4">
          {"{ }"}
        </div>
        <h2 className="text-lg font-semibold text-gray-700">
          Coming Soon — OP-84
        </h2>
        <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
          Field Conflict Resolution UI. When multiple sources disagree on a
          field value, this page will show side-by-side comparisons with source
          reliability context and smart resolution suggestions.
        </p>
        <p className="mt-4 text-xs text-gray-400">
          Depends on OP-83 (Multi-Source Cross-Validation)
        </p>
      </div>
    </div>
  );
}
