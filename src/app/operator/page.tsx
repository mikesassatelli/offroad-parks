import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { AppHeader } from "@/components/layout/AppHeader";
import { BarChart3, MapPin } from "lucide-react";

export default async function OperatorIndexPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  const memberships = await prisma.operatorUser.findMany({
    where: { userId: session.user.id },
    include: {
      operator: {
        select: {
          id: true,
          name: true,
          parks: {
            where: { status: "APPROVED" },
            select: {
              id: true,
              name: true,
              slug: true,
              address: {
                select: { city: true, state: true },
              },
            },
          },
        },
      },
    },
  });

  const managedParks = memberships.flatMap((m) =>
    m.operator.parks.map((park) => ({
      park,
      operatorName: m.operator.name,
      role: m.role,
    }))
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={session.user} showBackButton={true} />
      <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Manage Parks</h1>
        <p className="text-gray-500 text-sm mt-1">Select a park to manage.</p>
      </div>

      {managedParks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <MapPin className="w-8 h-8 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No parks yet</p>
            <p className="text-sm mt-1">
              You don&apos;t manage any parks yet.{" "}
              <Link
                href="/"
                className="text-primary underline underline-offset-2"
              >
                Browse parks
              </Link>{" "}
              and claim one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4" data-testid="park-list">
          {managedParks.map(({ park, operatorName, role }) => (
            <Card key={park.id}>
              <CardContent className="pt-4 pb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">{park.name}</p>
                  {(park.address?.city || park.address?.state) && (
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {park.address.city ? `${park.address.city}, ` : ""}
                      {park.address.state}
                    </p>
                  )}
                </div>
                <Link
                  href={`/operator/${park.slug}/dashboard`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted transition-colors flex-shrink-0"
                  data-testid={`dashboard-link-${park.slug}`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Operator Portal
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
