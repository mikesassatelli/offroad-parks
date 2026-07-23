import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PeopleTabs } from "@/components/admin/PeopleTabs";
import {
  OperatorManagementClient,
  type AdminOperatorRow,
} from "./OperatorManagementClient";

export default async function AdminOperatorsPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    redirect("/");
  }
  const isSuperAdmin = role === "SUPER_ADMIN";

  const operators = await prisma.operator.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      parks: {
        select: { id: true, slug: true, name: true },
        orderBy: { name: "asc" },
      },
      users: {
        select: {
          id: true,
          role: true,
          createdAt: true,
          user: {
            select: { id: true, email: true, name: true, image: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const rows: AdminOperatorRow[] = operators.map((o) => ({
    id: o.id,
    name: o.name,
    email: o.email,
    phone: o.phone,
    website: o.website,
    subscriptionStatus: o.subscriptionStatus,
    subscriptionTier: o.subscriptionTier,
    createdAt: o.createdAt.toISOString(),
    parks: o.parks.map((p) => ({ id: p.id, slug: p.slug, name: p.name })),
    users: o.users.map((u) => ({
      id: u.id,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
      user: {
        id: u.user.id,
        email: u.user.email,
        name: u.user.name,
        image: u.user.image,
      },
    })),
  }));

  return (
    <div>
      <PeopleTabs isSuperAdmin={isSuperAdmin} />
      <p className="text-sm text-muted-foreground mb-6">
        Manage operator accounts: create operators, attach/detach parks, and
        add or remove users. Normally operators are created through the
        Park Claims flow — this surface is for direct maintenance.
      </p>

      <OperatorManagementClient initialOperators={rows} />
    </div>
  );
}
