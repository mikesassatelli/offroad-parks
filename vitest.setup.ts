import "@testing-library/jest-dom";
import { vi } from "vitest";
import { __resetRateLimitStore } from "@/lib/rate-limit";

// Reset the in-memory rate-limit store between tests so module-level counters
// never leak across cases (OP-98). Harmless for files that never hit it.
beforeEach(() => {
  __resetRateLimitStore();
});

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

// jsdom doesn't implement matchMedia; provide a minimal stub so components that
// read viewport media queries (responsive nav in AppHeader/OffroadParksApp) can
// mount in tests. Defaults to no match (desktop-first render).
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

// Mock environment variables
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.NEXTAUTH_SECRET = "test-secret";
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
process.env.POSTGRES_PRISMA_URL = "postgresql://test:test@localhost:5432/test";
process.env.BLOB_READ_WRITE_TOKEN = "test-blob-token";
