import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: ["node_modules", ".next", "e2e"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.stories.{ts,tsx}",
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "src/**/__tests__/**",
        "src/app/layout.tsx", // Next.js boilerplate
        "src/app/api/auth/**", // NextAuth routes are tested via E2E
        "src/components/ui/**", // Radix UI wrappers, lower priority

        // Server Components - cannot be unit tested, covered by E2E tests
        "src/proxy.ts", // Edge middleware
        "src/lib/auth.ts", // NextAuth config
        "src/lib/prisma.ts", // Singleton pattern, tested indirectly
        "src/app/admin/layout.tsx", // Server component with async auth
        "src/app/admin/page.tsx", // Redirect-only page
        "src/app/admin/settings/page.tsx", // Placeholder server component
        "src/app/admin/users/page.tsx", // Server component with Prisma
        "src/app/admin/parks/new/page.tsx", // Server component wrapper
        "src/app/admin/parks/[id]/edit/page.tsx", // Server component for editing parks
        "src/app/admin/claims/page.tsx", // Server component with Prisma
        "src/app/admin/parks/bulk-upload/page.tsx", // Server component wrapper
        "src/app/admin/photos/bulk-upload/page.tsx", // Server component with Prisma
        "src/app/admin/reviews/page.tsx", // Server component with Prisma
        "src/lib/types.ts", // Pure type definitions, no logic to test

        // AI Research Engine - integration-only files (require Prisma/LLM/network)
        "src/lib/ai/research-pipeline.ts", // Orchestrator: Prisma + LLM + network
        "src/lib/ai/park-data-extractor.ts", // LLM wrapper: requires Anthropic API
        "src/lib/ai/park-discovery.ts", // Discovery: SerpApi + LLM + Prisma
        "src/lib/ai/field-display-names.ts", // Pure constant map, no logic
        "src/lib/ai/bulk-research.ts", // Orchestrator: Prisma + researchPark calls
        "src/lib/ai/cross-validation.ts", // Prisma queries (normalizer tested separately)
        "src/lib/ai/feedback-loop.ts", // Prisma aggregation queries
        "src/lib/ai/domain-reliability.ts", // Prisma queries
        "src/lib/ai/seed-domain-reliability.ts", // Prisma upserts

        // AI Research admin — server components, API routes, and admin-only client components
        "src/app/admin/ai-research/**",
        "src/app/api/admin/ai-research/**",
        "src/components/admin/DomainReliabilityTable.tsx",
        "src/components/admin/ParkDiscoveryTable.tsx",
        "src/components/admin/BulkResearchPanel.tsx",
        "src/components/admin/ConflictResolutionTable.tsx",

        // Admin API routes with Prisma/auth deps (tested via E2E)
        "src/app/api/admin/parks/list/route.ts",
        "src/app/api/admin/photos/**",
        "src/app/api/admin/reviews/**",
        "src/app/api/parks/[slug]/conditions/[conditionId]/route.ts",
        "src/app/api/reviews/user/route.ts",
      ],
      thresholds: {
        lines: 65,
        functions: 60,
        branches: 60,
        statements: 65,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
