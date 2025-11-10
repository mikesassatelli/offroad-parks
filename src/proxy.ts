import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect admin routes
  if (pathname.startsWith("/admin")) {
    // Check for session cookie
    const sessionToken =
      request.cookies.get("authjs.session-token")?.value ||
      request.cookies.get("__Secure-authjs.session-token")?.value;

    if (!sessionToken) {
      // Not logged in - redirect to sign in
      const signInUrl = new URL("/api/auth/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }

    // For role checking, we'll do it server-side in the layout
    // since we can't access the database in edge/proxy runtime
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
