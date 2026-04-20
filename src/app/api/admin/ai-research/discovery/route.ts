import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { discoverParksInState } from "@/lib/ai/park-discovery";
import { estimateCost } from "@/lib/ai/config";
import { normalizeStateName } from "@/lib/us-states";

export async function POST(request: Request) {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  let body: { state?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { state } = body;

  const canonicalState = normalizeStateName(state);
  if (!canonicalState) {
    return NextResponse.json(
      {
        error:
          "state must be a US state full name (e.g. 'Arkansas') or 2-letter code (e.g. 'AR')",
      },
      { status: 400 }
    );
  }

  try {
    const { candidates, inputTokens, outputTokens } =
      await discoverParksInState(canonicalState);

    return NextResponse.json({
      success: true,
      candidatesFound: candidates.length,
      inputTokens,
      outputTokens,
      estimatedCost: estimateCost(inputTokens, outputTokens),
    });
  } catch (error) {
    console.error("[discovery] Error discovering parks:", error);
    return NextResponse.json(
      { error: "Discovery failed" },
      { status: 500 }
    );
  }
}
