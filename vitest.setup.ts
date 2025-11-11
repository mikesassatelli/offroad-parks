import "@testing-library/jest-dom";
import { vi } from "vitest";
import * as React from "react";

// React 19 compatibility: Polyfill React.act for testing libraries
// React 19 removed ReactDOMTestUtils.act, but testing libraries still try to use it
if (typeof React.act === "undefined") {
  // @ts-expect-error - Polyfilling act for React 19 compatibility
  React.act = async (callback: () => void | Promise<void>) => {
    const result = callback();
    if (result && typeof result.then === "function") {
      await result;
    }
    return undefined;
  };
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
