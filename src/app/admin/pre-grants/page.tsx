import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PreGrantManagementClient, type PreGrantRow } from "./PreGrantManagementClient";

export default async function AdminPreGrantsPage() {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    redirect("/admin/dashboard");
  }

  const grants = await prisma.userPreGrant.findMany({
    orderBy: [{ appliedAt: "asc" }, { createdAt: "desc" }],
  });

  const rows: PreGrantRow[] = grants.map((g) => ({
    id: g.id,
    email: g.email,
    grantRole: g.grantRole,
    operatorParkSlug: g.operatorParkSlug,
    notes: g.notes,
    appliedAt: g.appliedAt ? g.appliedAt.toISOString() : null,
    appliedToUserId: g.appliedToUserId,
    createdAt: g.createdAt.toISOString(),
  }));

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-2">Pre-grants</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Declare a role and/or operator membership for an email so it is applied
        automatically on their first sign-in. Useful for onboarding beta
        testers without making them go through the claim flow.
      </p>

      <PreGrantManagementClient initialGrants={rows} />
    </div>
  );
}
