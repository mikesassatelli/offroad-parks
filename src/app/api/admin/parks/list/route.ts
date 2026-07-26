import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAdminView } from "@/lib/roles";

export const runtime = "nodejs";

// GET /api/admin/parks/list - Lightweight park list for admin tools
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAdminView(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parks = await prisma.park.findMany({
    where: { status: "APPROVED" },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: {
          photos: {
            where: { status: "APPROVED" },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    parks: parks.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      photoCount: p._count.photos,
    })),
  });
}
