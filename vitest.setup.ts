import "@testing-library/jest-dom";
import { vi } from "vitest";

// React 19 compatibility: Polyfill React.act for testing libraries
// React 19 changed how act works, causing issues with @testing-library/react
// Import React dynamically to ensure we get the right version
const actPolyfill = async (callback: () => void | Promise<void>) => {
  const result = callback();
  if (result && typeof result.then === "function") {
    await result;
  }
  return undefined;
};

// Set up React.act before any other imports
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  if (typeof React.act !== "function") {
    Object.defineProperty(React, "act", {
      value: actPolyfill,
      writable: true,
      configurable: true,
    });
  }
} catch (error) {
  // Failed to set up React.act polyfill
  console.warn("Could not polyfill React.act:", error);
}

// React 19 compatibility: Ensure global.IS_REACT_ACT_ENVIRONMENT is set
// This tells React Testing Library to use the correct act implementation
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: "/",
    query: {},
    asPath: "/",
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock Next.js server-only
vi.mock("server-only", () => ({}));

// Mock environment variables
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.NEXTAUTH_SECRET = "test-secret";
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
process.env.POSTGRES_PRISMA_URL = "postgresql://test:test@localhost:5432/test";
process.env.BLOB_READ_WRITE_TOKEN = "test-blob-token";
