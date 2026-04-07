import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { discoverParksInState } from "@/lib/ai/park-discovery";
import { estimateCost } from "@/lib/ai/config";

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

  if (!state || typeof state !== "string" || state.length !== 2) {
    return NextResponse.json(
      { error: "state must be a two-letter abbreviation" },
      { status: 400 }
    );
  }

  try {
    const { candidates, inputTokens, outputTokens } =
      await discoverParksInState(state.toUpperCase());

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
