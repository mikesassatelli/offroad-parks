import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, MapPin } from "lucide-react";

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
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Operator Portal</h1>
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
        <div className="space-y-3" data-testid="park-list">
          {managedParks.map(({ park, operatorName, role }) => (
            <Link
              key={park.id}
              href={`/operator/${park.slug}/dashboard`}
              className="block group"
            >
              <Card className="transition-shadow group-hover:shadow-md">
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                        {park.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {park.address?.city
                          ? `${park.address.city}, `
                          : ""}
                        {park.address?.state} · {operatorName} ·{" "}
                        <span className="capitalize">
                          {role.toLowerCase()}
                        </span>
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors flex-shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
