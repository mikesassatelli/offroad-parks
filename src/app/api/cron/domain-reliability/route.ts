import { NextResponse } from "next/server";
import { applyDomainAutoTune } from "@/lib/ai/domain-tuning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Nightly assisted-auto tuning: nudge domain reliability scores toward observed
 * approve/reject accuracy (bounded) and compute block suggestions. Triggered on
 * a schedule by .github/workflows/domain-reliability.yml (GitHub Actions cron).
 * Guarded by CRON_SECRET: `Authorization: Bearer $CRON_SECRET`.
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
    const { updates, blockSuggestions } = await applyDomainAutoTune();
    return NextResponse.json({
      ok: true,
      adjusted: updates.length,
      updates,
      blockSuggestions,
    });
  } catch (error) {
    console.error("[cron/domain-reliability] tune failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "tune failed" },
      { status: 500 }
    );
  }
}
