import { prisma } from "@/lib/prisma";
import type { ResearchTrigger } from "@/lib/types";
import {
  estimateCost,
  MAX_SOURCES_PER_SESSION,
  MIN_SOURCES_FOR_NOT_FOUND,
  EXTRACTABLE_FIELDS,
} from "./config";
import { extractContent } from "./content-extractor";
import { extractParkData } from "./park-data-extractor";
import {
  getExcludedFields,
  calculateCompleteness,
  shouldGraduate,
  getCurrentFieldValue,
} from "./research-lifecycle";
import { isAllowedByRobots, clearRobotsCache } from "./robots";
import { discoverSources } from "./source-discovery";

/**
 * Run the full AI research pipeline for a single park.
 * Creates a ResearchSession, discovers/crawls sources, extracts data,
 * and creates FieldExtraction records for admin review.
 */
export async function researchPark(
  parkId: string,
  trigger: ResearchTrigger
): Promise<{ sessionId: string }> {
  // Clear robots cache for fresh session
  clearRobotsCache();

  // Fetch park with relations
  const park = await prisma.park.findUnique({
    where: { id: parkId },
    include: {
      terrain: true,
      amenities: true,
      camping: true,
      vehicleTypes: true,
      address: true,
      dataSources: true,
    },
  });

  if (!park) throw new Error(`Park not found: ${parkId}`);

  // Create research session
  const session = await prisma.researchSession.create({
    data: {
      parkId,
      trigger,
      status: "IN_PROGRESS",
      startedAt: new Date(),
    },
  });

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalFieldsExtracted = 0;
  let totalSourcesFound = 0;

  try {
    // Get fields to exclude (already resolved)
    const excludedFields = await getExcludedFields(parkId);

    // If all fields are resolved, nothing to do
    const remainingFields = Object.keys(EXTRACTABLE_FIELDS).filter(
      (f) => !excludedFields.includes(f)
    );
    if (remainingFields.length === 0) {
      await completeSession(session.id, {
        status: "COMPLETED",
        summary: "All fields already resolved. No extraction needed.",
        fieldsExtracted: 0,
        sourcesFound: 0,
        inputTokens: 0,
        outputTokens: 0,
      });
      return { sessionId: session.id };
    }

    // Stage 1: Source Discovery (for parks still being actively researched)
    if (
      park.researchStatus === "NEEDS_RESEARCH" ||
      park.researchStatus === "IN_PROGRESS"
    ) {
      const existingUrls = park.dataSources.map((s) => s.url);
      const newSources = await discoverSources(
        park.name,
        park.address?.state ?? "",
        existingUrls
      );

      for (const source of newSources) {
        await prisma.dataSource.create({
          data: {
            parkId,
            url: source.url,
            title: source.title,
            type: source.type,
            origin: "AI_DISCOVERED",
          },
        });
        totalSourcesFound++;
      }
    }

    // Fetch all sources for this park
    const sources = await prisma.dataSource.findMany({
      where: {
        parkId,
        crawlStatus: { notIn: ["ROBOTS_BLOCKED", "SKIPPED"] },
      },
      orderBy: [{ reliability: "desc" }, { createdAt: "asc" }],
      take: MAX_SOURCES_PER_SESSION,
    });

    // Track which fields were found across all sources
    const fieldsFoundInSources = new Map<string, number>();

    // Stage 2 & 3: Content Extraction + Data Extraction per source
    for (const source of sources) {
      try {
        // Check robots.txt
        const allowed = await isAllowedByRobots(source.url);
        if (!allowed) {
          await prisma.dataSource.update({
            where: { id: source.id },
            data: { crawlStatus: "ROBOTS_BLOCKED" },
          });
          continue;
        }

        // Extract content
        const content = await extractContent(source.url);

        // Check if content has changed
        const contentChanged =
          source.lastContentHash != null &&
          source.lastContentHash !== content.contentHash;

        // Update source metadata
        await prisma.dataSource.update({
          where: { id: source.id },
          data: {
            lastCrawledAt: new Date(),
            lastContentHash: content.contentHash,
            contentChanged,
            crawlStatus: "SUCCESS",
            crawlError: null,
            title: content.title ?? source.title,
          },
        });

        // Skip LLM extraction if content hasn't changed and was previously crawled
        if (
          source.lastCrawledAt != null &&
          !contentChanged &&
          trigger !== "ADMIN_MANUAL"
        ) {
          continue;
        }

        // Link source to session
        await prisma.researchSessionSource.create({
          data: { sessionId: session.id, dataSourceId: source.id },
        });

        // Skip LLM if no remaining fields
        if (remainingFields.length === 0) continue;

        // Extract structured data via LLM
        const result = await extractParkData(
          park.name,
          park.address?.state ?? "",
          content.text,
          source.url,
          excludedFields
        );

        totalInputTokens += result.inputTokens;
        totalOutputTokens += result.outputTokens;

        // Create FieldExtraction records for each extracted field
        const extraction = result.extraction;
        for (const [key, fieldData] of Object.entries(extraction)) {
          if (!fieldData) continue;

          // Map flat address keys to dot notation
          const addressFields = [
            "streetAddress",
            "city",
            "zipCode",
            "county",
          ];
          const fieldName = addressFields.includes(key)
            ? `address.${key}`
            : key;

          const extractedValueJson = JSON.stringify(fieldData.value);
          const currentValueJson = getCurrentFieldValue(
            park as unknown as import("@/lib/types").DbPark,
            fieldName
          );

          // Auto-approve if extracted value matches current value (confirmation)
          const valuesMatch =
            currentValueJson !== null &&
            normalizeForComparison(extractedValueJson) ===
              normalizeForComparison(currentValueJson);

          await prisma.fieldExtraction.create({
            data: {
              parkId,
              fieldName,
              extractedValue: extractedValueJson,
              confidence: "AI_EXTRACTED",
              confidenceScore: fieldData.confidence,
              status: valuesMatch ? "APPROVED" : "PENDING_REVIEW",
              verifiedAt: valuesMatch ? new Date() : null,
              dataSourceId: source.id,
              sessionId: session.id,
              sourcesChecked: 1,
            },
          });

          totalFieldsExtracted++;

          // Track that this field was found in at least one source
          fieldsFoundInSources.set(
            fieldName,
            (fieldsFoundInSources.get(fieldName) ?? 0) + 1
          );
        }
      } catch (sourceError) {
        // Mark source as failed, continue with next source
        await prisma.dataSource.update({
          where: { id: source.id },
          data: {
            crawlStatus: "FAILED",
            crawlError:
              sourceError instanceof Error
                ? sourceError.message
                : String(sourceError),
          },
        });
      }
    }

    // Stage 4: Mark NOT_FOUND fields
    // If we checked enough sources and a field was never found, mark it NOT_FOUND
    const successfulSourceCount = sources.filter(
      (s) => s.crawlStatus === "SUCCESS" || s.lastCrawledAt != null
    ).length;

    if (successfulSourceCount >= MIN_SOURCES_FOR_NOT_FOUND) {
      for (const field of remainingFields) {
        if (!fieldsFoundInSources.has(field)) {
          // Check if there's already a NOT_FOUND for this field
          const existing = await prisma.fieldExtraction.findFirst({
            where: { parkId, fieldName: field, confidence: "NOT_FOUND" },
          });

          if (!existing) {
            await prisma.fieldExtraction.create({
              data: {
                parkId,
                fieldName: field,
                extractedValue: null,
                confidence: "NOT_FOUND",
                confidenceScore: null,
                status: "APPROVED",
                sourcesChecked: successfulSourceCount,
                sessionId: session.id,
              },
            });
          }
        }
      }
    }

    // Update park metadata
    const completenessScore = calculateCompleteness(park);
    const approvedCount = await prisma.fieldExtraction.count({
      where: { parkId, status: "APPROVED" },
    });

    const updateData: Record<string, unknown> = {
      lastResearchedAt: new Date(),
      dataCompletenessScore: completenessScore,
    };

    // Advance research status
    if (park.researchStatus === "NEEDS_RESEARCH") {
      updateData.researchStatus = "IN_PROGRESS";
    }

    if (
      shouldGraduate(park, approvedCount, sources.length) &&
      park.researchStatus !== "RESEARCHED" &&
      park.researchStatus !== "MAINTENANCE"
    ) {
      updateData.researchStatus = "RESEARCHED";
    }

    await prisma.park.update({
      where: { id: parkId },
      data: updateData,
    });

    // Complete session
    await completeSession(session.id, {
      status: "COMPLETED",
      summary: `Processed ${sources.length} sources. Extracted ${totalFieldsExtracted} fields. ${remainingFields.length} fields remaining.`,
      fieldsExtracted: totalFieldsExtracted,
      sourcesFound: totalSourcesFound,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    });
  } catch (error) {
    // Mark session as failed
    await completeSession(session.id, {
      status: "FAILED",
      errorMessage:
        error instanceof Error ? error.message : String(error),
      fieldsExtracted: totalFieldsExtracted,
      sourcesFound: totalSourcesFound,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    });
  }

  return { sessionId: session.id };
}

/**
 * Normalize a JSON-encoded value for comparison.
 * Sorts arrays so ["rocks","sand"] matches ["sand","rocks"].
 * Trims and lowercases strings so "5551234567" matches "5551234567".
 */
function normalizeForComparison(jsonStr: string): string {
  try {
    const val = JSON.parse(jsonStr);
    if (Array.isArray(val)) {
      return JSON.stringify([...val].sort());
    }
    if (typeof val === "string") {
      return JSON.stringify(val.trim().toLowerCase());
    }
    return JSON.stringify(val);
  } catch {
    return jsonStr;
  }
}

async function completeSession(
  sessionId: string,
  data: {
    status: "COMPLETED" | "FAILED" | "PARTIAL";
    summary?: string;
    errorMessage?: string;
    fieldsExtracted: number;
    sourcesFound: number;
    inputTokens: number;
    outputTokens: number;
  }
) {
  await prisma.researchSession.update({
    where: { id: sessionId },
    data: {
      status: data.status,
      summary: data.summary,
      errorMessage: data.errorMessage,
      fieldsExtracted: data.fieldsExtracted,
      sourcesFound: data.sourcesFound,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      estimatedCostUSD: estimateCost(data.inputTokens, data.outputTokens),
      completedAt: new Date(),
    },
  });
}
