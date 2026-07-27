import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimited, RATE_LIMITS } from "@/lib/rate-limit";
import { parseJsonBody } from "@/lib/api-helpers";
import {
  isCorrectableField,
  correctableFieldType,
  OWNERSHIP_OPTIONS,
} from "@/lib/ai/park-fields";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ slug: string }>;
};

// Discriminated union: a structured field-level correction, or a free-text
// "something else" report. `value` is validated per-field after we know the
// field's canonical type (see coerceFieldValue).
const correctionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("field"),
    fieldName: z.string().min(1),
    value: z.unknown(),
    note: z.string().trim().max(500).nullish(),
  }),
  z.object({
    kind: z.literal("text"),
    note: z.string().trim().min(1, "Please describe the correction.").max(2000),
  }),
]);

/**
 * Validate a submitted value against the field's canonical value type. Returns
 * `{ value }` with the normalized value on success, or `{ error }` with a
 * user-facing message. The normalized value is what gets JSON.stringified into
 * the FieldExtraction row so the existing approve route can apply it.
 */
function coerceFieldValue(
  valueType: string,
  raw: unknown,
): { value: unknown } | { error: string } {
  switch (valueType) {
    case "boolean": {
      if (typeof raw !== "boolean") {
        return { error: "Value must be true or false." };
      }
      return { value: raw };
    }
    case "number": {
      if (typeof raw !== "number" || Number.isNaN(raw)) {
        return { error: "Value must be a number." };
      }
      return { value: raw };
    }
    case "Ownership": {
      if (
        typeof raw !== "string" ||
        !(OWNERSHIP_OPTIONS as readonly string[]).includes(raw)
      ) {
        return {
          error: `Value must be one of: ${OWNERSHIP_OPTIONS.join(", ")}.`,
        };
      }
      return { value: raw };
    }
    case "string":
    default: {
      if (typeof raw !== "string" || raw.trim().length === 0) {
        return { error: "Value must be a non-empty string." };
      }
      return { value: raw.trim() };
    }
  }
}

// POST /api/parks/[slug]/corrections
// Submit a correction for a park. Must be logged in.
// - kind: "field" → inserted as a PENDING_REVIEW FieldExtraction (confidence
//   USER_SUBMITTED) that flows through the existing AI review queue and
//   auto-applies to the park on approve.
// - kind: "text"  → inserted as a ParkCorrectionReport for admin triage.
export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = rateLimited(
    checkRateLimit(`corrections:${session.user.id}`, RATE_LIMITS.corrections),
  );
  if (limited) return limited;

  const { slug } = await params;

  const park = await prisma.park.findUnique({ where: { slug } });
  if (!park) {
    return NextResponse.json({ error: "Park not found" }, { status: 404 });
  }

  const parsed = await parseJsonBody(request, correctionSchema);
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;

  if (body.kind === "text") {
    const report = await prisma.parkCorrectionReport.create({
      data: {
        parkId: park.id,
        userId: session.user.id,
        note: body.note,
      },
    });

    return NextResponse.json(
      {
        success: true,
        kind: "text",
        report,
        message: "Thanks! Your report was submitted for review.",
      },
      { status: 201 },
    );
  }

  // kind === "field"
  if (!isCorrectableField(body.fieldName)) {
    return NextResponse.json(
      { error: `"${body.fieldName}" is not a correctable field.` },
      { status: 400 },
    );
  }

  const valueType = correctableFieldType(body.fieldName);
  const coerced = coerceFieldValue(valueType, body.value);
  if ("error" in coerced) {
    return NextResponse.json({ error: coerced.error }, { status: 400 });
  }

  const userNote = body.note?.trim() || null;

  const extraction = await prisma.fieldExtraction.create({
    data: {
      parkId: park.id,
      fieldName: body.fieldName,
      extractedValue: JSON.stringify(coerced.value),
      sourceQuote: userNote,
      confidence: "USER_SUBMITTED",
      status: "PENDING_REVIEW",
      dataSourceId: null,
      sessionId: null,
    },
  });

  return NextResponse.json(
    {
      success: true,
      kind: "field",
      extraction,
      message: "Thanks! Your correction was submitted for review.",
    },
    { status: 201 },
  );
}
