import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const MIGRATION = join(
  ROOT,
  "prisma/migrations/20260727010000_park_correction_reports/migration.sql",
);
const SCHEMA = join(ROOT, "prisma/schema.prisma");

describe("park_correction_reports migration", () => {
  it("migration file exists", () => {
    expect(existsSync(MIGRATION)).toBe(true);
  });

  it("creates the enum, table, indexes and FKs", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toContain(
      `CREATE TYPE "CorrectionReportStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED')`,
    );
    expect(sql).toContain(`CREATE TABLE "ParkCorrectionReport"`);
    expect(sql).toContain(`CREATE INDEX "ParkCorrectionReport_parkId_idx"`);
    expect(sql).toContain(`CREATE INDEX "ParkCorrectionReport_status_idx"`);
    expect(sql).toMatch(/REFERENCES "Park"\("id"\) ON DELETE CASCADE/);
    expect(sql).toMatch(/REFERENCES "User"\("id"\) ON DELETE CASCADE/);
  });

  it("schema declares the model, enum and reverse relations", () => {
    const schema = readFileSync(SCHEMA, "utf8");
    expect(schema).toMatch(/model ParkCorrectionReport \{/);
    expect(schema).toMatch(/enum CorrectionReportStatus \{/);
    // reverse relations on Park and User
    expect(schema).toMatch(/correctionReports\s+ParkCorrectionReport\[\]/);
  });
});
