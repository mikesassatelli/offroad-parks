import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { transformDbPark } from "@/lib/types";
import { ParkDetailPage } from "@/features/parks/detail/ParkDetailPage";
import { auth } from "@/lib/auth";
import { isAlertActive, sortAlertsForDisplay } from "@/lib/park-alerts";
import type { ParkAlertDisplay } from "@/components/parks/ParkAlertsBanner";

interface ParkPageProps {
  params: Promise<{ id: string }>;
}

/* v8 ignore next - tested via E2E */
export async function generateStaticParams() {
  const parks = await prisma.park.findMany({
    where: {
      status: "APPROVED",
    },
    select: {
      slug: true,
    },
  });

  return parks.map((park) => ({
    id: park.slug,
  }));
}

export async function generateMetadata({ params }: ParkPageProps) {
  const { id } = await params;

  const dbPark = await prisma.park.findUnique({
    where: {
      slug: id,
      status: "APPROVED",
    },
    include: {
      terrain: true,
      amenities: true,
      camping: true,
      vehicleTypes: true,
      address: true,
    },
  });

  if (!dbPark) {
    return {
      title: "Park Not Found",
    };
  }

  const park = transformDbPark(dbPark);

  return {
    title: `${park.name} - Offroad Parks`,
    description:
      park.notes ||
      `Information about ${park.name} in ${park.address.city ? `${park.address.city}, ` : ""}${park.address.state}`,
  };
}

export default async function ParkPage({ params }: ParkPageProps) {
  const { id } = await params;
  const session = await auth();

  const dbPark = await prisma.park.findUnique({
    where: {
      slug: id,
      status: "APPROVED",
    },
    include: {
      terrain: true,
      amenities: true,
      camping: true,
      vehicleTypes: true,
      address: true,
      operator: { select: { name: true } },
    },
  });

  if (!dbPark) {
    notFound();
  }

  // Fetch approved photos for this park
  const photos = await prisma.parkPhoto.findMany({
    where: {
      parkId: dbPark.id,
      status: "APPROVED",
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const park = transformDbPark(dbPark);

  // Fetch active operator-posted alerts. Filter in JS so the predicate stays in
  // one place (src/lib/park-alerts#isAlertActive) and is unit-testable.
  const now = new Date();
  const candidateAlerts = await prisma.parkAlert.findMany({
    where: {
      parkId: dbPark.id,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: {
      id: true,
      title: true,
      body: true,
      severity: true,
      startsAt: true,
      expiresAt: true,
      isActive: true,
      createdAt: true,
    },
  });
  const activeAlerts: ParkAlertDisplay[] = sortAlertsForDisplay(
    candidateAlerts.filter((a) => isAlertActive(a, now))
  ).map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    severity: a.severity,
    createdAt: a.createdAt.toISOString(),
  }));

  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN";

  // Fetch any existing claim from this user for this park (any status)
  const existingClaim = session?.user?.id
    ? await prisma.parkClaim.findUnique({
        where: { parkId_userId: { parkId: dbPark.id, userId: session.user.id } },
        select: { status: true, reviewNotes: true },
      })
    : null;

  // Check if the current user is an operator of this park
  const isOperatorOfPark =
    session?.user?.id && dbPark.operatorId
      ? !!(await prisma.operatorUser.findUnique({
          where: {
            operatorId_userId: { operatorId: dbPark.operatorId, userId: session.user.id },
          },
          select: { id: true },
        }))
      : false;

  return (
    <ParkDetailPage
      park={park}
      photos={photos}
      currentUserId={session?.user?.id}
      isAdmin={isAdmin}
      parkDbId={dbPark.id}
      existingClaim={existingClaim}
      isOperatorOfPark={isOperatorOfPark}
      operatorName={dbPark.operator?.name ?? null}
      alerts={activeAlerts}
    />
  );
}
