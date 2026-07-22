import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { seedParkCandidatesByName } from "@/lib/ai/park-discovery";
import { normalizeStateName } from "@/lib/us-states";

// POST — manually seed one or more park names as PENDING candidates, skipping
// the SerpApi + LLM discovery step. Body: { state, names: string[] }.
export async function POST(request: Request) {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  let body: { state?: string; names?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const canonicalState = normalizeStateName(body.state);
  if (!canonicalState) {
    return NextResponse.json(
      {
        error:
          "state must be a US state full name (e.g. 'Arkansas') or 2-letter code (e.g. 'AR')",
      },
      { status: 400 }
    );
  }

  const names = Array.isArray(body.names)
    ? body.names.filter((n): n is string => typeof n === "string")
    : [];
  if (names.length === 0) {
    return NextResponse.json(
      { error: "Provide at least one park name to seed" },
      { status: 400 }
    );
  }

  try {
    const { candidates, skipped } = await seedParkCandidatesByName(
      canonicalState,
      names
    );

    return NextResponse.json({
      success: true,
      candidatesFound: candidates.length,
      skipped: skipped.length,
      skippedDetails: skipped,
    });
  } catch (error) {
    console.error("[discovery/seed] Error seeding candidates:", error);
    return NextResponse.json({ error: "Seeding failed" }, { status: 500 });
  }
}
