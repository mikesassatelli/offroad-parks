import { redirect } from "next/navigation";
import { getOperatorContext } from "@/lib/operator-auth";
import { OperatorConditionsClient } from "./OperatorConditionsClient";

interface ConditionsPageProps {
  params: Promise<{ parkSlug: string }>;
}

export default async function OperatorConditionsPage({ params }: ConditionsPageProps) {
  const { parkSlug } = await params;
  const ctx = await getOperatorContext(parkSlug);

  if (!ctx) {
    redirect("/");
  }

  return <OperatorConditionsClient parkSlug={parkSlug} parkName={ctx.parkName} />;
}
