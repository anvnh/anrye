import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const cookieHeader = (req as any).headers.get("cookie") || "";
  const rf = cookieHeader.split(/;\s*/).find((x: string) => x.startsWith("gc_refresh="));
  if (!rf) return NextResponse.json({ error: "NO_REFRESH" }, { status: 401 });

  const refreshToken = decodeURIComponent(rf.split("=")[1]);

  // First get a fresh access token
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
    res.cookies.set("gc_refresh", "", { path: "/", maxAge: 0 });
    return res;
  }

  const tokenData = await tokenResp.json();
  const accessToken = tokenData.access_token;

  // Now fetch user info using the access token
  const userResp = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`);
  
  if (!userResp.ok) {
    return NextResponse.json({ error: "USERINFO_FAILED" }, { status: 401 });
  }

  const userData = await userResp.json();
  return NextResponse.json({
    name: userData.name,
    email: userData.email,
    picture: userData.picture,
    id: userData.id
  });
}
