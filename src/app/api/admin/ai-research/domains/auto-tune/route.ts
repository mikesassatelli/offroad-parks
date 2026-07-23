import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { applyDomainAutoTune } from "@/lib/ai/domain-tuning";

// POST — run a domain-reliability tuning pass on demand (the same work the
// nightly cron does), so an admin can apply the latest feedback immediately.
export async function POST() {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  try {
    const { updates, blockSuggestions } = await applyDomainAutoTune();
    return NextResponse.json({
      success: true,
      adjusted: updates.length,
      updates,
      blockSuggestions,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tuning failed" },
      { status: 500 }
    );
  }
}
