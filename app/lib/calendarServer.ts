// Server-side utilities for Google Calendar API
import { NextRequest } from "next/server";

export async function getCalendarBearerFromRequest(req: NextRequest): Promise<string> {
  const cookieHeader = req.headers.get("cookie") || "";
  const rf = cookieHeader.split(/;\s*/).find((x: string) => x.startsWith("gc_refresh="));
  if (!rf) throw new Error("NO_REFRESH");

  const refreshToken = decodeURIComponent(rf.split("=")[1]);

  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!tokenResp.ok) {
    throw new Error("REFRESH_FAILED");
  }

  const data = await tokenResp.json();
  return data.access_token;
}
