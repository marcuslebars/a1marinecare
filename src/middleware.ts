import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_PATH = "/admin";
const ADMIN_PASSWORD = process.env.ADMIN_DASHBOARD_PASSWORD;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith(ADMIN_PATH)) {
    return NextResponse.next();
  }

  if (!ADMIN_PASSWORD) {
    console.warn("[Admin Auth] ADMIN_DASHBOARD_PASSWORD not set - protecting with default password");
  }

  const authHeader = request.headers.get("authorization");
  const expected = ADMIN_PASSWORD
    ? `admin:${ADMIN_PASSWORD}`
    : "admin:a1marinecare2024";

  if (authHeader) {
    const base64 = authHeader.replace(/^Basic\s+/i, "");
    try {
      const decoded = Buffer.from(base64, "base64").toString("utf-8");
      if (decoded === expected) {
        return NextResponse.next();
      }
    } catch {
      // invalid base64
    }
  }

  return new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="A1 Marine Care Admin"`,
    },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};