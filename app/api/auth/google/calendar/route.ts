import { NextResponse } from "next/server";
import { signValue } from "@/app/lib/authCookies";
import { getBaseUrl, needsBaseRedirect } from "@/app/lib/env";
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

  const redirectCheck = needsBaseRedirect(req);
  if (redirectCheck.redirect && redirectCheck.target) {
    // Force user onto stable base domain before initiating Google OAuth (avoid preview domain mismatch)
    return NextResponse.redirect(redirectCheck.target);
  }

  const base = getBaseUrl(req);
  const appOrigin = base || new URL(req.url).origin;
  const redirectUri = `${appOrigin}/api/auth/google/calendar/callback`;

  const url = new URL(req.url);

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
    "https://www.googleapis.com/auth/calendar",
  ].join(" ");

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
  resp.cookies.set("oauth_state_cal", signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  return resp;
}
``
