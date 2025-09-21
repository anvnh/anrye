import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const cookieHeader = (req as any).headers.get("cookie") || "";
  const rf = cookieHeader.split(/;\s*/).find((x: string) => x.startsWith("gd_refresh="));
  if (!rf) return NextResponse.json({ error: "NO_REFRESH" }, { status: 401 });

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
    const res = NextResponse.json({ error: "REFRESH_FAILED" }, { status: 401 });
    res.cookies.set("gd_refresh", "", { path: "/", maxAge: 0 });
    return res;
  }

  const data = await tokenResp.json();
  return NextResponse.json({
    access_token: data.access_token,
    expires_in: data.expires_in,
    token_type: data.token_type,
  });
}
