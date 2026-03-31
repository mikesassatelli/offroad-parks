import { redirect } from "next/navigation";
import { getOperatorContext } from "@/lib/operator-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

interface ConditionsPageProps {
  params: Promise<{ parkSlug: string }>;
}

export default async function OperatorConditionsPage({ params }: ConditionsPageProps) {
  const { parkSlug } = await params;
  const ctx = await getOperatorContext(parkSlug);

  if (!ctx) {
    redirect("/");
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Activity className="w-6 h-6" />
          Trail Status
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Post trail condition updates for {ctx.parkName}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coming in OP-65</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The operator trail status management UI will be implemented in OP-65.
            Operators will be able to post OPEN, CLOSED, CAUTION, MUDDY, WET, or SNOW
            status updates that appear prominently on the public park listing with a
            &ldquo;Park Management&rdquo; badge.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
