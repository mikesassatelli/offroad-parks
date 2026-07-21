import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncIowaOhvAlerts } from "@/lib/iowa-ohv/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The scrape + reconcile is quick, but give it headroom over the DNR fetch.
export const maxDuration = 60;

/**
 * Daily cron: scrape the Iowa DNR OHV alerts page and reconcile park-closure
 * banners. Wired up in vercel.json `crons`. Vercel attaches
 * `Authorization: Bearer $CRON_SECRET` to scheduled invocations; we reject
 * anything else once CRON_SECRET is configured.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const summary = await syncIowaOhvAlerts({ prisma });
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("[cron/iowa-ohv-alerts] sync failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "sync failed" },
      { status: 500 }
    );
  }
}
