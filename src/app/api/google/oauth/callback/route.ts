import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/google/oauth/callback";

  if (!code) {
    return NextResponse.json({ error: "No authorization code received" }, { status: 400 });
  }

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not set" }, { status: 500 });
  }

  console.log("[Google OAuth] Received code, exchanging for tokens...");

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await response.json();

    if (!response.ok) {
      console.error("[Google OAuth] Token exchange FAILED:", tokens);
      return NextResponse.json({ error: "Token exchange failed", details: tokens }, { status: 500 });
    }

    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    const expiresIn = tokens.expires_in;

    console.log("===========================================");
    console.log("GOOGLE ACCESS TOKEN:", accessToken);
    console.log("GOOGLE REFRESH TOKEN:", refreshToken);
    console.log("EXPIRES IN:", expiresIn, "seconds");
    console.log("===========================================");

    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head><title>Google OAuth Success</title></head>
<body style="font-family: monospace; padding: 40px; text-align: center;">
  <h2 style="color: green;">Google OAuth Successful!</h2>
  <p>Check your <strong>server console logs</strong> for your tokens.</p>
  <pre style="background: #f4f4f4; padding: 20px; border-radius: 8px; text-align: left; max-width: 600px; margin: 20px auto;">
REFRESH TOKEN: ${refreshToken ?? "NOT RETURNED - may need to re-authorize"}
ACCESS TOKEN: ${accessToken ? "received (check logs)" : "NOT RECEIVED"}
EXPIRES IN: ${expiresIn}s
  </pre>
  <p style="color: #666;">Add to your .env or environment variables:</p>
  <pre style="background: #e8e8e8; padding: 15px; border-radius: 8px; text-align: left; max-width: 600px; margin: 10px auto;">
GOOGLE_CLIENT_ID=${clientId}
GOOGLE_CLIENT_SECRET=${clientSecret}
GOOGLE_REFRESH_TOKEN=${refreshToken ?? "YOUR_REFRESH_TOKEN_HERE"}
  </pre>
</body>
</html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  } catch (err) {
    console.error("[Google OAuth] Unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error during token exchange" }, { status: 500 });
  }
}
