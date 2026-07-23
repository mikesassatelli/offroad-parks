import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PeopleTabs } from "@/components/admin/PeopleTabs";
import {
  UserManagementTable,
  type AssignableRole,
  type ManagedUser,
} from "@/components/admin/UserManagementTable";

export default async function AdminUsersPage() {
  const session = await auth();
  const viewerRole = session?.user?.role;
  const canEditRoles = viewerRole === "SUPER_ADMIN";

  const rows = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { submittedParks: true } },
    },
  });

  const users: ManagedUser[] = rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as AssignableRole,
    submittedParkCount: u._count.submittedParks,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div>
      <PeopleTabs isSuperAdmin={canEditRoles} />
      <p className="text-sm text-muted-foreground mb-6">
        {canEditRoles
          ? "As a super admin, you can promote or demote users."
          : "Only the super admin can change user roles."}
      </p>

      <UserManagementTable
        users={users}
        currentUserId={session?.user?.id ?? ""}
        canEditRoles={canEditRoles}
      />
    </div>
  );
}
