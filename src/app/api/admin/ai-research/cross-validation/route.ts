import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { crossValidatePark } from "@/lib/ai/cross-validation";

export async function POST(request: Request) {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  let body: { parkId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { parkId } = body;

  if (!parkId) {
    return NextResponse.json(
      { error: "parkId is required" },
      { status: 400 }
    );
  }

  try {
    const results = await crossValidatePark(parkId);

    const conflictCount = results.filter((r) => r.isConflict).length;
    const agreementCount = results.filter(
      (r) => r.agreedValue !== null
    ).length;

    return NextResponse.json({
      results,
      conflictCount,
      agreementCount,
    });
  } catch (error) {
    console.error("Cross-validation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Cross-validation failed",
      },
      { status: 500 }
    );
  }
}
