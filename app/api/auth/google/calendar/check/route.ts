import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const c = await cookies();
  const hasRefresh = !!c.get("gc_refresh")?.value;

  // Cookie header is used to forward the user's cookies to the server
  const cookieHeader = c.getAll().map((x) => `${x.name}=${x.value}`).join("; ");

  let tokenOk = false;
  let accessSample = "";
  try {
    const origin = new URL(req.url).origin;
    const r = await fetch(`${origin}/api/auth/google/calendar/token`, {
      method: "POST",
      headers: {
        Cookie: cookieHeader, // User's cookies
        "Content-Type": "application/json",
      },
    });
    tokenOk = r.ok;
    if (tokenOk) {
      const j = await r.json();
      accessSample = (j?.access_token ?? "").slice(0, 8);
    }
  } catch { }

  return NextResponse.json({ hasRefresh, tokenOk, accessSample });
}
