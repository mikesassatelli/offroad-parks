import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { getOperatorContext } from "@/lib/operator-auth";
import { prisma } from "@/lib/prisma";
import { OperatorConditionsModerationClient } from "./OperatorConditionsModerationClient";

interface OperatorConditionsModerationPageProps {
  params: Promise<{ parkSlug: string }>;
}

export default async function OperatorConditionsModerationPage({
  params,
}: OperatorConditionsModerationPageProps) {
  const { parkSlug } = await params;

  const ctx = await getOperatorContext(parkSlug);
  if (!ctx) {
    redirect("/");
  }

  const conditions = await prisma.trailCondition.findMany({
    where: { parkId: ctx.parkId },
    include: {
      park: {
        select: {
          name: true,
          slug: true,
        },
      },
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: [
      { reportStatus: "asc" },
      { createdAt: "desc" },
    ],
  });

  const pendingCount = conditions.filter(
    (c) => c.reportStatus === "PENDING_REVIEW",
  ).length;
  const publishedCount = conditions.filter(
    (c) => c.reportStatus === "PUBLISHED",
  ).length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
          <ShieldAlert className="w-8 h-8" />
          Trail Condition Moderation
        </h1>
        <p className="text-muted-foreground">
          Review and moderate community trail condition reports for {ctx.parkName}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-lg border border-orange-200 dark:border-orange-900/40 p-4">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {pendingCount}
          </div>
          <div className="text-sm text-muted-foreground">Pending Review</div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {publishedCount}
          </div>
          <div className="text-sm text-muted-foreground">Published</div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="text-2xl font-bold text-foreground">
            {conditions.length}
          </div>
          <div className="text-sm text-muted-foreground">Total Reports</div>
        </div>
      </div>

      <OperatorConditionsModerationClient
        parkSlug={parkSlug}
        conditions={conditions}
      />
    </div>
  );
}
