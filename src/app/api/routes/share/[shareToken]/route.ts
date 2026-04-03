import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ShareContext = { params: Promise<{ shareToken: string }> };

// GET /api/routes/share/[shareToken] — no auth required, public only
export async function GET(_request: Request, context: ShareContext) {
  const { shareToken } = await context.params;

  const route = await prisma.route.findUnique({ where: { shareToken } });

  if (!route || !route.isPublic) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(route);
}
