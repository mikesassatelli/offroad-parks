export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Application Settings
        </h2>
        <p className="text-gray-600">
          Settings management coming soon. This will include:
        </p>
        <ul className="mt-4 space-y-2 text-gray-600 list-disc list-inside">
          <li>Site configuration</li>
          <li>Email notifications</li>
          <li>Submission moderation rules</li>
          <li>SEO settings</li>
          <li>API keys management</li>
        </ul>
      </div>
    </div>
  );
}
