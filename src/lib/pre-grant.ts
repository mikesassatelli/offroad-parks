/**
 * Pre-grant application logic.
 *
 * A pre-grant (`UserPreGrant`) declares the role + operator membership a
 * user should have the first time they sign in with a given email. This
 * lets us onboard beta testers / operators without making them go through
 * the claim-submission flow or wait on a SUPER_ADMIN to flip switches.
 *
 * The call path:
 *   - NextAuth `events.createUser` fires when an email signs in for the
 *     very first time → calls `applyPreGrantForNewUser`.
 *   - SUPER_ADMIN can also click "Apply" on an existing pre-grant from
 *     the admin UI to retroactively grant a user who already signed in.
 *
 * Outcomes are idempotent: a grant is marked `appliedAt` once consumed
 * and never re-applied.
 */
import type { Prisma, PrismaClient, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface ApplyPreGrantInput {
  email: string;
  userId: string;
}

export type ApplyPreGrantResult =
  | { status: "no-grant" }
  | { status: "already-applied"; appliedAt: Date }
  | {
      status: "applied";
      grantedRole: UserRole | null;
      operatorParkSlug: string | null;
      operatorId: string | null;
    }
  | { status: "park-not-found"; parkSlug: string }
  | { status: "park-has-other-operator"; parkSlug: string; operatorId: string };

type TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Apply a pre-grant to a user. The user is expected to already exist
 * (NextAuth's PrismaAdapter has created the row before `events.createUser`
 * fires).
 *
 * Behavior:
 *   - If no grant exists for this email → returns { status: "no-grant" }.
 *   - If the grant was already applied → returns { status: "already-applied" }.
 *   - If `grantRole` is set → updates User.role.
 *   - If `operatorParkSlug` is set → creates Operator + OperatorUser and
 *     sets Park.operatorId, *unless* the park already has a different
 *     operator (in which case we only attach the user to that existing
 *     operator as OWNER — does not overwrite ownership).
 *
 * All writes happen in a single transaction so partial state cannot
 * survive a crash.
 */
export async function applyPreGrant(
  input: ApplyPreGrantInput,
): Promise<ApplyPreGrantResult> {
  return prisma.$transaction(async (tx) => applyPreGrantTx(tx as TxClient, input));
}

/**
 * Tx-scoped variant — call this when you already have an open transaction.
 * Exposed for tests and for the seed-time migration path.
 */
export async function applyPreGrantTx(
  tx: TxClient,
  input: ApplyPreGrantInput,
): Promise<ApplyPreGrantResult> {
  const grant = await tx.userPreGrant.findUnique({
    where: { email: input.email },
  });
  if (!grant) {
    return { status: "no-grant" };
  }
  if (grant.appliedAt) {
    return { status: "already-applied", appliedAt: grant.appliedAt };
  }

  // 1. Role grant.
  if (grant.grantRole) {
    await tx.user.update({
      where: { id: input.userId },
      data: { role: grant.grantRole },
    });
  }

  // 2. Operator grant.
  let operatorId: string | null = null;
  if (grant.operatorParkSlug) {
    const park = await tx.park.findUnique({
      where: { slug: grant.operatorParkSlug },
      include: { operator: { select: { id: true } } },
    });
    if (!park) {
      return { status: "park-not-found", parkSlug: grant.operatorParkSlug };
    }

    if (park.operatorId) {
      // Park already has an operator — attach this user to that operator
      // as OWNER rather than refusing the grant. Avoids the awkward "grant
      // half-worked" outcome when a previous tester already claimed the
      // park.
      operatorId = park.operatorId;
      // Don't error on duplicate OperatorUser — upsert keeps it idempotent.
      await tx.operatorUser.upsert({
        where: {
          operatorId_userId: { operatorId, userId: input.userId },
        },
        update: {},
        create: {
          operatorId,
          userId: input.userId,
          role: "OWNER",
        },
      });
    } else {
      // No operator on the park yet — create one and wire it up. Same
      // transaction shape as src/app/api/admin/claims/[id]/approve/route.ts
      // so behavior matches an approved claim.
      const userForOperator = await tx.user.findUnique({
        where: { id: input.userId },
        select: { email: true, name: true },
      });
      const operator = await tx.operator.create({
        data: {
          name: userForOperator?.name ?? userForOperator?.email ?? "Operator",
          email: userForOperator?.email ?? input.email,
        },
      });
      operatorId = operator.id;
      await tx.operatorUser.create({
        data: {
          operatorId: operator.id,
          userId: input.userId,
          role: "OWNER",
        },
      });
      await tx.park.update({
        where: { id: park.id },
        data: { operatorId: operator.id },
      });
    }
  }

  // 3. Mark grant as applied.
  await tx.userPreGrant.update({
    where: { id: grant.id },
    data: {
      appliedAt: new Date(),
      appliedToUserId: input.userId,
    },
  });

  return {
    status: "applied",
    grantedRole: grant.grantRole,
    operatorParkSlug: grant.operatorParkSlug,
    operatorId,
  };
}

/**
 * Called from the NextAuth `events.createUser` hook. Swallows errors and
 * logs them — pre-grant failure must never block sign-in. Worst case the
 * SUPER_ADMIN retries the grant manually from the admin UI.
 */
export async function applyPreGrantForNewUser(
  input: ApplyPreGrantInput,
): Promise<void> {
  try {
    const result = await applyPreGrant(input);
    if (result.status === "applied") {
      console.log(
        `[pre-grant] Applied to ${input.email}: role=${result.grantedRole}, ` +
          `operator=${result.operatorParkSlug ?? "—"}`,
      );
    } else if (result.status !== "no-grant") {
      console.warn(
        `[pre-grant] Did not apply to ${input.email}:`,
        result,
      );
    }
  } catch (err) {
    console.error(
      `[pre-grant] Unexpected error applying grant for ${input.email}:`,
      err,
    );
  }
}

/**
 * Re-export for type imports without leaking the Prisma namespace.
 */
export type UserPreGrantRow = Prisma.UserPreGrantGetPayload<Record<string, never>>;
