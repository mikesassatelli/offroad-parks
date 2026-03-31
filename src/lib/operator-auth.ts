import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type OperatorContext = {
  userId: string;
  operatorId: string;
  operatorName: string;
  parkId: string;
  parkName: string;
  parkSlug: string;
  role: string; // "OWNER" | "MEMBER"
};

/**
 * Verifies the current session user is an operator member for the given park slug.
 * Returns the operator context or null if unauthorized.
 */
export async function getOperatorContext(
  parkSlug: string
): Promise<OperatorContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  // Find the park and its operator, check that this user is a member
  const park = await prisma.park.findUnique({
    where: { slug: parkSlug, status: "APPROVED" },
    select: {
      id: true,
      name: true,
      slug: true,
      operatorId: true,
      operator: {
        select: {
          id: true,
          name: true,
          users: {
            where: { userId: session.user.id },
            select: { role: true },
          },
        },
      },
    },
  });

  if (!park?.operator) return null;
  if (park.operator.users.length === 0) return null;

  return {
    userId: session.user.id,
    operatorId: park.operator.id,
    operatorName: park.operator.name,
    parkId: park.id,
    parkName: park.name,
    parkSlug: park.slug,
    role: park.operator.users[0].role,
  };
}
