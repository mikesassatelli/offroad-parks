import { redirect } from "next/navigation";
import { getOperatorContext } from "@/lib/operator-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

interface SettingsPageProps {
  params: Promise<{ parkSlug: string }>;
}

export default async function OperatorSettingsPage({ params }: SettingsPageProps) {
  const { parkSlug } = await params;
  const ctx = await getOperatorContext(parkSlug);

  if (!ctx) {
    redirect("/");
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Park Settings
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Edit listing details for {ctx.parkName}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coming in OP-66</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The operator park listing editor will be implemented in OP-66.
            Operators will be able to edit their park&apos;s details — including pricing,
            amenities, contact info, and operational attributes — without admin moderation.
            All changes will be recorded in an audit log.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
