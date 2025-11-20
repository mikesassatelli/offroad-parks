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
      ],
      thresholds: {
        lines: 65,
        functions: 65,
        branches: 65,
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
