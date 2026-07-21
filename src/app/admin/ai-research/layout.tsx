import { prisma } from "@/lib/prisma";
import { BrainCircuit } from "lucide-react";
import { AIResearchTabs } from "@/components/admin/AIResearchTabs";

export default async function AIResearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pendingReviewCount = await prisma.fieldExtraction.count({
    where: { status: "PENDING_REVIEW" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BrainCircuit className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Research</h1>
          <p className="text-sm text-muted-foreground">
            Discover new parks, research existing ones, and review proposed changes before they go live.
          </p>
        </div>
      </div>

      <AIResearchTabs pendingReviewCount={pendingReviewCount} />

      <div>{children}</div>
    </div>
  );
}
