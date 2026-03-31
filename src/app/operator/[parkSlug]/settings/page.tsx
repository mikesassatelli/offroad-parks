import { redirect } from "next/navigation";
import { getOperatorContext } from "@/lib/operator-auth";
import { OperatorSettingsClient } from "./OperatorSettingsClient";

interface SettingsPageProps {
  params: Promise<{ parkSlug: string }>;
}

export default async function OperatorSettingsPage({ params }: SettingsPageProps) {
  const { parkSlug } = await params;
  const ctx = await getOperatorContext(parkSlug);

  if (!ctx) {
    redirect("/");
  }

  return <OperatorSettingsClient parkSlug={parkSlug} parkName={ctx.parkName} />;
}
