import { handlers } from "@/lib/auth";

// Force Node.js runtime instead of Edge Runtime
export const runtime = "nodejs";

export const { GET, POST } = handlers;
