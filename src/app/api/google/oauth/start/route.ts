import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "https://a1marinecare.ca/api/google/oauth/callback";

  if (!clientId) {
    return NextResponse.json({ error: "GOOGLE_CLIENT_ID is not set" }, { status: 500 });
  }

  if (!redirectUri) {
    return NextResponse.json({ error: "GOOGLE_REDIRECT_URI is not set" }, { status: 500 });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar",
    access_type: "offline",
    prompt: "consent",
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

  console.log("[Google OAuth Start] redirect_uri:", redirectUri);
  console.log("[Google OAuth Start] Full auth URL:", authUrl);

  return NextResponse.redirect(authUrl);
}
