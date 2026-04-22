import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { getOperatorContext } from "@/lib/operator-auth";
import { OperatorReviewsClient } from "./OperatorReviewsClient";

interface OperatorReviewsPageProps {
  params: Promise<{ parkSlug: string }>;
}

export default async function OperatorReviewsPage({
  params,
}: OperatorReviewsPageProps) {
  const { parkSlug } = await params;

  const ctx = await getOperatorContext(parkSlug);
  if (!ctx) {
    redirect("/");
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
          <MessageSquare className="w-8 h-8" />
          Review Moderation
        </h1>
        <p className="text-muted-foreground">
          Review and moderate user reviews for {ctx.parkName}
        </p>
      </div>

      <OperatorReviewsClient parkSlug={parkSlug} />
    </div>
  );
}
