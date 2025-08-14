import { NextResponse } from "next/server";
import { signValue } from "@/app/lib/authCookies";
import { randomUUID } from "crypto";

export async function GET(req: Request) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return new NextResponse("Missing GOOGLE_CLIENT_ID", { status: 500 });
  }
  if (!process.env.GOOGLE_CLIENT_SECRET) {
    return new NextResponse("Missing GOOGLE_CLIENT_SECRET", { status: 500 });
  }
  if (!process.env.JWT_SECRET) {
    return new NextResponse("Missing JWT_SECRET", { status: 500 });
  }

  const url = new URL(req.url);
  const appOrigin = url.origin; // http://localhost:3000 hoặc https://anrye.netlify.app
  const redirectUri = `${appOrigin}/api/auth/google/callback`;

  // Get 'origin' (path to return after login), only allow internal paths
  const rawOriginPath = url.searchParams.get("origin") || "/";
  const originPath = rawOriginPath.startsWith("/") ? rawOriginPath : "/";

  // Create state value
  const stateUuid = randomUUID();
  const stateRaw = `${stateUuid}|${Date.now()}|${originPath}`;
  const signed = signValue(stateRaw, process.env.JWT_SECRET);

  // Scope
  const scope = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive.readonly",
  ].join(" ");

  // Tham số OAuth (offline + consent để lấy refresh_token)
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    scope,
    state: stateUuid,
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  const resp = NextResponse.redirect(googleAuthUrl);
  resp.cookies.set("oauth_state", signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60, // 10 phút
  });

  return resp;
}
``
