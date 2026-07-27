import { prisma } from "@/lib/prisma";
import type { DbPark, ResearchTrigger } from "@/lib/types";
import {
  estimateCost,
  MAX_SOURCES_PER_SESSION,
  MIN_SOURCES_FOR_NOT_FOUND,
  EXTRACTABLE_FIELDS,
  GOOGLE_PLACES_COST_PER_LOOKUP,
} from "./config";
import {
  lookupGooglePlace,
  placeToFieldValues,
  PLACE_PROVIDED_FIELDS,
  GOOGLE_PLACES_RELIABILITY,
  GOOGLE_PLACES_CONFIDENCE,
  type PlaceData,
} from "./google-places";
import { extractContent } from "./content-extractor";
import { extractParkData } from "./park-data-extractor";
import {
  getExcludedFields,
  calculateCompleteness,
  shouldGraduate,
  getCurrentFieldValue,
  resolveTerminalStatus,
} from "./research-lifecycle";
import type { ResearchStatus } from "@/lib/types";
import { isAllowedByRobots, clearRobotsCache } from "./robots";
import { getDefaultReliabilityForSource } from "./domain-reliability";
import { discoverSources, normalizeUrl } from "./source-discovery";
import {
  PHONE_FIELDS,
  URL_FIELDS,
  cleanStreetAddress,
  cleanCounty,
  validateExtraction,
} from "./extraction-validator";
import { normalizeStateName } from "@/lib/us-states";

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

  // IN_PROGRESS is a transient "actively running" state. Set it up front and
  // resolve to a terminal state in `finally` so a crashed run never leaves the
  // park stuck. MAINTENANCE is left alone (admin-managed).
  const priorStatus = park.researchStatus as ResearchStatus;
  if (priorStatus !== "IN_PROGRESS" && priorStatus !== "MAINTENANCE") {
    await prisma.park.update({
      where: { id: parkId },
      data: { researchStatus: "IN_PROGRESS" },
    });
  }

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalPlacesCostUSD = 0;
  let totalFieldsExtracted = 0;
  let totalSourcesFound = 0;
  let sourcesProcessed = 0;
  let graduated = false;

  try {
    // Get fields to exclude (already resolved)
    const excludedFields = await getExcludedFields(parkId);

    // If all fields are resolved, nothing to do
    const remainingFields = Object.keys(EXTRACTABLE_FIELDS).filter(
      (f) => !excludedFields.includes(f)
    );
    if (remainingFields.length === 0) {
      // Nothing left to research — every field is approved or marked not-found.
      graduated = true;
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

    // Track which fields were found across all sources (including Places).
    const fieldsFoundInSources = new Map<string, number>();

    // OP-82: Collect validation warnings across all sources.
    const validationWarnings: string[] = [];

    // Fields Places supplied this session — excluded from LLM re-extraction so
    // the model isn't asked to re-guess (and pay for) values Places already gave
    // authoritatively. Kept separate from `excludedFields`, which means
    // "already resolved" (APPROVED / NOT_FOUND).
    const placeFoundFields = new Set<string>();

    const activelyResearching =
      priorStatus === "NEEDS_RESEARCH" ||
      priorStatus === "IN_PROGRESS" ||
      priorStatus === "PARTIAL";

    // Stage 0: Google Places lookup — authoritative, structured location data.
    // Runs before web-source discovery so its high-quality values take
    // precedence and the LLM doesn't re-guess fields Places already supplied.
    if (activelyResearching) {
      const placeRelevantRemaining: string[] = PLACE_PROVIDED_FIELDS.filter(
        (f) => remainingFields.includes(f)
      );

      // Skip the paid call entirely when no Places-provided field still needs
      // research.
      if (placeRelevantRemaining.length > 0) {
        const lookup = await lookupGooglePlace(
          park.name,
          park.address?.state ?? "",
          park.address?.city ?? null
        );

        if (lookup.apiCalled) {
          totalPlacesCostUSD += GOOGLE_PLACES_COST_PER_LOOKUP;
        }

        if (lookup.place) {
          const place = lookup.place;

          // Persist a googlePlaces DataSource (upsert — idempotent across
          // re-runs). It is consumed structurally, never crawled, so it's kept
          // out of the crawl query below by its type.
          const placeSource = await prisma.dataSource.upsert({
            where: { parkId_url: { parkId, url: place.mapsUri } },
            update: {
              crawlStatus: "SUCCESS",
              lastCrawledAt: new Date(),
              title: `Google Maps — ${place.name}`,
            },
            create: {
              parkId,
              url: place.mapsUri,
              title: `Google Maps — ${place.name}`,
              type: "googlePlaces",
              origin: "AI_DISCOVERED",
              reliability: GOOGLE_PLACES_RELIABILITY,
              crawlStatus: "SUCCESS",
              lastCrawledAt: new Date(),
            },
          });
          totalSourcesFound++;

          // Link the Places source to this session.
          await prisma.researchSessionSource.upsert({
            where: {
              sessionId_dataSourceId: {
                sessionId: session.id,
                dataSourceId: placeSource.id,
              },
            },
            update: {},
            create: { sessionId: session.id, dataSourceId: placeSource.id },
          });

          // Record the stable place_id for future re-lookups / map links.
          if (park.googlePlaceId !== place.placeId) {
            await prisma.park.update({
              where: { id: parkId },
              data: { googlePlaceId: place.placeId },
            });
          }

          // Emit FieldExtraction records for each field Places supplied.
          for (const { fieldName, value } of placeToFieldValues(place)) {
            if (!placeRelevantRemaining.includes(fieldName)) continue;

            const validation = validateExtraction(
              fieldName,
              value,
              park.address?.state ?? null
            );
            if (!validation.valid) {
              validationWarnings.push(
                `Google Places ${fieldName}: ${validation.reason}`
              );
              continue;
            }

            const created = await createPlaceFieldExtraction(
              park as unknown as DbPark,
              parkId,
              fieldName,
              value,
              place,
              placeSource.id,
              session.id
            );
            if (created) totalFieldsExtracted++;

            // Mark the field as found (even a deduped duplicate counts) so the
            // NOT_FOUND sweep won't fire for a field Places did supply, and skip
            // LLM re-extraction of it this session.
            fieldsFoundInSources.set(
              fieldName,
              (fieldsFoundInSources.get(fieldName) ?? 0) + 1
            );
            placeFoundFields.add(fieldName);
          }
        } else if (lookup.reason) {
          validationWarnings.push(lookup.reason);
        }
      }
    }

    // Stage 1: Source Discovery (for parks still being actively researched)
    if (activelyResearching) {
      // Exclude all existing URLs + URLs previously rejected as wrong park
      const existingUrls = park.dataSources.map((s) => s.url);
      const newSources = await discoverSources(
        park.name,
        park.address?.state ?? "",
        existingUrls
      );

      for (const source of newSources) {
        // Look up domain-level reliability for this source
        const domainReliability = await getDefaultReliabilityForSource(
          source.url
        );

        // Skip blocked domains (reliability === 0 from a blocked domain)
        if (domainReliability === 0) continue;

        await prisma.dataSource.create({
          data: {
            parkId,
            url: source.url,
            title: source.title,
            type: source.type,
            origin: "AI_DISCOVERED",
            reliability: domainReliability,
          },
        });
        totalSourcesFound++;
      }
    }

    // Fetch all sources for this park
    // Include robots-blocked sources IF they have a one-time override.
    // googlePlaces sources are consumed structurally in Stage 0, not crawled, so
    // they're excluded here by type.
    const sources = await prisma.dataSource.findMany({
      where: {
        parkId,
        type: { not: "googlePlaces" },
        OR: [
          { crawlStatus: { notIn: ["ROBOTS_BLOCKED", "SKIPPED", "WRONG_PARK"] } },
          { crawlStatus: "ROBOTS_BLOCKED", robotsOverride: true },
        ],
      },
      orderBy: [{ reliability: "desc" }, { createdAt: "asc" }],
      take: MAX_SOURCES_PER_SESSION,
    });

    // Fields the LLM should still try to extract: everything unresolved MINUS
    // what Places already supplied this session (no point paying to re-guess).
    const llmExcludeFields = [...excludedFields, ...placeFoundFields];
    const llmRemainingFields = remainingFields.filter(
      (f) => !placeFoundFields.has(f)
    );

    // Stage 2 & 3: Content Extraction + Data Extraction per source
    for (const source of sources) {
      try {
        // Check robots.txt (skip check if admin granted a one-time override)
        if (source.robotsOverride) {
          // One-time override — clear the flag so it won't bypass robots again
          await prisma.dataSource.update({
            where: { id: source.id },
            data: { robotsOverride: false },
          });
        } else {
          const allowed = await isAllowedByRobots(source.url);
          if (!allowed) {
            await prisma.dataSource.update({
              where: { id: source.id },
              data: { crawlStatus: "ROBOTS_BLOCKED" },
            });
            continue;
          }
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

        // OP-81: Wrong-park detection guard
        const { validateParkRelevance } = await import("./wrong-park-guard");
        const relevance = await validateParkRelevance(
          park.name,
          park.address?.state ?? "",
          content.text,
        );
        totalInputTokens += relevance.inputTokens;
        totalOutputTokens += relevance.outputTokens;

        if (!relevance.isRelevant) {
          // Auto-mark as wrong park
          await prisma.dataSource.update({
            where: { id: source.id },
            data: { crawlStatus: "WRONG_PARK", crawlError: relevance.reason },
          });
          continue;
        }

        // Link source to session
        await prisma.researchSessionSource.create({
          data: { sessionId: session.id, dataSourceId: source.id },
        });

        // Skip LLM if no remaining fields (after removing Places-supplied ones)
        if (llmRemainingFields.length === 0) continue;

        // Extract structured data via LLM
        const result = await extractParkData(
          park.name,
          park.address?.state ?? "",
          content.text,
          source.url,
          llmExcludeFields
        );

        totalInputTokens += result.inputTokens;
        totalOutputTokens += result.outputTokens;

        // Create FieldExtraction records for each extracted field
        const extraction = result.extraction;
        for (const [key, fieldData] of Object.entries(extraction)) {
          if (!fieldData) continue;

          // `state` is extracted for verification only — never stored/applied
          // (the park's state is set at creation). A mismatch is a wrong-park
          // signal, surfaced as a session warning.
          if (key === "state") {
            const sourceState = normalizeStateName(String(fieldData.value));
            const parkState = park.address?.state ?? null;
            if (sourceState && parkState && sourceState !== parkState) {
              validationWarnings.push(
                `${source.url}: source names ${sourceState}, but park is in ${parkState} (possible wrong park)`
              );
            }
            continue;
          }

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

          // OP-82: Post-extraction validation
          const validation = validateExtraction(fieldName, fieldData.value, park.address?.state ?? null);
          if (!validation.valid) {
            // Drop this field — don't create a FieldExtraction record
            validationWarnings.push(`${fieldName}: ${validation.reason}`);
            continue;
          }

          const currentValueJson = getCurrentFieldValue(
            park as unknown as import("@/lib/types").DbPark,
            fieldName
          );

          // For array fields (terrain, amenities, camping, vehicleTypes):
          // Only store NEW values that the park doesn't already have.
          const arrayFields = ["terrain", "amenities", "camping", "vehicleTypes"];
          const isArrayField = arrayFields.includes(fieldName);

          let extractedValueJson: string;
          let valuesMatch: boolean;

          if (isArrayField && Array.isArray(fieldData.value)) {
            const currentArr: string[] = currentValueJson
              ? JSON.parse(currentValueJson)
              : [];
            const currentSet = new Set(currentArr);
            const newValues = (fieldData.value as string[]).filter(
              (v) => !currentSet.has(v)
            );

            if (newValues.length === 0) {
              // All extracted values already exist — auto-approve as confirmation
              extractedValueJson = JSON.stringify(fieldData.value);
              valuesMatch = true;
            } else {
              // Only store the genuinely new values
              extractedValueJson = JSON.stringify(newValues);
              valuesMatch = false;
            }
          } else {
            // Normalize address fields before storing:
            //  - streetAddress: strip an accidental city/state/zip tail
            //  - county: strip the "County"/"Parish"/… suffix so "Polk County"
            //    is stored (and matched) as just "Polk"
            let scalarValue: unknown = fieldData.value;
            if (typeof fieldData.value === "string") {
              if (fieldName === "address.streetAddress") {
                scalarValue = cleanStreetAddress(fieldData.value);
              } else if (fieldName === "address.county") {
                scalarValue = cleanCounty(fieldData.value);
              }
            }

            extractedValueJson = JSON.stringify(scalarValue);
            valuesMatch =
              currentValueJson !== null &&
              normalizeForComparison(extractedValueJson, fieldName) ===
                normalizeForComparison(currentValueJson, fieldName);
          }

          // For pending array extractions, deduplicate: skip if an identical
          // suggestion already exists for this park+field in this session
          if (!valuesMatch && isArrayField) {
            const existing = await prisma.fieldExtraction.findFirst({
              where: {
                parkId,
                fieldName,
                status: "PENDING_REVIEW",
              },
            });
            if (
              existing?.extractedValue &&
              normalizeForComparison(existing.extractedValue, fieldName) ===
                normalizeForComparison(extractedValueJson, fieldName)
            ) {
              // Duplicate suggestion — skip
              fieldsFoundInSources.set(
                fieldName,
                (fieldsFoundInSources.get(fieldName) ?? 0) + 1
              );
              continue;
            }
          }

          await prisma.fieldExtraction.create({
            data: {
              parkId,
              fieldName,
              extractedValue: extractedValueJson,
              // Snippet from the source showing where the value came from, so an
              // admin can verify without opening the page. The LLM returns this
              // per field (see park-data-extractor prompt).
              sourceQuote: fieldData.source_quote?.trim() || null,
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

    // Decide graduation. The park's terminal research status is applied in the
    // `finally` block so it's set exactly once, on every exit path.
    const approvedCount = await prisma.fieldExtraction.count({
      where: { parkId, status: "APPROVED" },
    });
    sourcesProcessed = sources.length;
    graduated = shouldGraduate(park, approvedCount, sourcesProcessed);

    // Complete session
    const summaryParts = [
      `Processed ${sources.length} sources. Extracted ${totalFieldsExtracted} fields. ${remainingFields.length} fields remaining.`,
    ];
    if (validationWarnings.length > 0) {
      summaryParts.push(`Validation warnings: ${validationWarnings.join("; ")}`);
    }
    await completeSession(session.id, {
      status: "COMPLETED",
      summary: summaryParts.join(" "),
      fieldsExtracted: totalFieldsExtracted,
      sourcesFound: totalSourcesFound,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      extraCostUSD: totalPlacesCostUSD,
    });
  } catch (error) {
    // Mark session as failed. `graduated` stays false → park resolves to PARTIAL.
    await completeSession(session.id, {
      status: "FAILED",
      errorMessage:
        error instanceof Error ? error.message : String(error),
      fieldsExtracted: totalFieldsExtracted,
      sourcesFound: totalSourcesFound,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      extraCostUSD: totalPlacesCostUSD,
    });
  } finally {
    // Always leave a terminal resting state — never a dangling IN_PROGRESS.
    const terminalStatus = resolveTerminalStatus(priorStatus, graduated);
    await prisma.park
      .update({
        where: { id: parkId },
        data: {
          researchStatus: terminalStatus,
          lastResearchedAt: new Date(),
          dataCompletenessScore: calculateCompleteness(park),
        },
      })
      .catch(() => {
        // Best-effort — never mask the run's real outcome with a write error.
      });
  }

  return { sessionId: session.id };
}

/**
 * Normalize a JSON-encoded value for comparison so that a value which merely
 * *looks* different from the current one isn't queued for review. Comparison is
 * field-type-aware when `fieldName` is supplied:
 *  - arrays: order-insensitive (["rocks","sand"] === ["sand","rocks"])
 *  - phone: digits only ("(555) 123-4567" === "5551234567")
 *  - url: scheme/www/trailing-slash/tracking-param insensitive
 *  - numeric fields: 25 === 25.0, and "$25" === 25
 *  - county: "Polk County" === "Polk" (suffix ignored)
 *  - other strings: trimmed, lowercased, whitespace-collapsed
 */
export function normalizeForComparison(
  jsonStr: string,
  fieldName?: string
): string {
  try {
    const val = JSON.parse(jsonStr);

    if (Array.isArray(val)) {
      return JSON.stringify([...val].sort());
    }

    // JSON.parse already collapses numeric formatting (25 vs 25.0 → 25).
    if (typeof val === "number") {
      return JSON.stringify(val);
    }

    if (typeof val === "string") {
      if (fieldName && PHONE_FIELDS.has(fieldName)) {
        return JSON.stringify(val.replace(/\D/g, ""));
      }
      if (fieldName && URL_FIELDS.has(fieldName)) {
        return JSON.stringify(normalizeUrlForComparison(val));
      }
      // County: "Polk County" === "Polk" (suffix ignored).
      if (fieldName === "address.county") {
        return JSON.stringify(cleanCounty(val).toLowerCase());
      }
      // A numeric-typed field that arrived as a string ("$25", "25 mi").
      if (fieldName && EXTRACTABLE_FIELDS[fieldName] === "number") {
        const numeric = Number(val.replace(/[^0-9.-]/g, ""));
        if (val.trim() !== "" && !Number.isNaN(numeric)) {
          return JSON.stringify(numeric);
        }
      }
      return JSON.stringify(val.trim().toLowerCase().replace(/\s+/g, " "));
    }

    return JSON.stringify(val);
  } catch {
    return jsonStr;
  }
}

/** URL comparison key: ignore scheme, www, trailing slash, tracking params, case. */
function normalizeUrlForComparison(url: string): string {
  try {
    return normalizeUrl(url)
      .replace(/^https?:\/\//i, "")
      .toLowerCase();
  } catch {
    return url.trim().toLowerCase();
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
    /** Non-token costs (e.g. Google Places API calls) added to the token cost. */
    extraCostUSD?: number;
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
      estimatedCostUSD:
        estimateCost(data.inputTokens, data.outputTokens) +
        (data.extraCostUSD ?? 0),
      completedAt: new Date(),
    },
  });
}

/**
 * Create a FieldExtraction for a single scalar value supplied by Google Places.
 * Mirrors the scalar branch of the LLM extraction loop: address fields are
 * cleaned, the value is auto-approved when it already matches the park's current
 * value (a confirmation) and otherwise queued for review, and an identical
 * pending suggestion is deduped so idempotent re-runs don't pile up.
 *
 * Returns true if a record was created, false if it was deduped.
 */
async function createPlaceFieldExtraction(
  park: DbPark,
  parkId: string,
  fieldName: string,
  value: string | number,
  place: PlaceData,
  dataSourceId: string,
  sessionId: string
): Promise<boolean> {
  let scalarValue: unknown = value;
  if (typeof value === "string") {
    if (fieldName === "address.streetAddress") {
      scalarValue = cleanStreetAddress(value);
    } else if (fieldName === "address.county") {
      scalarValue = cleanCounty(value);
    }
  }

  const extractedValueJson = JSON.stringify(scalarValue);
  const currentValueJson = getCurrentFieldValue(park, fieldName);
  const valuesMatch =
    currentValueJson !== null &&
    normalizeForComparison(extractedValueJson, fieldName) ===
      normalizeForComparison(currentValueJson, fieldName);

  // Dedup: skip if an identical suggestion is already queued for review, so a
  // re-run against the same listing doesn't create duplicate pending records.
  if (!valuesMatch) {
    const existing = await prisma.fieldExtraction.findFirst({
      where: { parkId, fieldName, status: "PENDING_REVIEW" },
    });
    if (
      existing?.extractedValue &&
      normalizeForComparison(existing.extractedValue, fieldName) ===
        normalizeForComparison(extractedValueJson, fieldName)
    ) {
      return false;
    }
  }

  await prisma.fieldExtraction.create({
    data: {
      parkId,
      fieldName,
      extractedValue: extractedValueJson,
      sourceQuote: `Google Maps listing: ${place.name}`.slice(0, 100),
      confidence: "AI_EXTRACTED",
      confidenceScore: GOOGLE_PLACES_CONFIDENCE,
      status: valuesMatch ? "APPROVED" : "PENDING_REVIEW",
      verifiedAt: valuesMatch ? new Date() : null,
      dataSourceId,
      sessionId,
      sourcesChecked: 1,
    },
  });
  return true;
}
