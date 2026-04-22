import { redirect } from "next/navigation";
import { getOperatorContext } from "@/lib/operator-auth";
import { OperatorAlertsClient } from "./OperatorAlertsClient";

interface AlertsPageProps {
  params: Promise<{ parkSlug: string }>;
}

export default async function OperatorAlertsPage({ params }: AlertsPageProps) {
  const { parkSlug } = await params;
  const ctx = await getOperatorContext(parkSlug);

  if (!ctx) {
    redirect("/");
  }

  return <OperatorAlertsClient parkSlug={parkSlug} parkName={ctx.parkName} />;
}
