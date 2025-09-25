import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const c = await cookies();
  const hasRefresh = !!c.get("gd_refresh")?.value;

  // Ghép tất cả cookie của user để forward
  const cookieHeader = c.getAll().map((x) => `${x.name}=${x.value}`).join("; ");

  let tokenOk = false;
  let accessSample = "";
  try {
    const origin = new URL(req.url).origin;
    const r = await fetch(`${origin}/api/auth/google/drive/token`, {
      method: "POST",
      headers: {
        Cookie: cookieHeader,          // <- QUAN TRỌNG: forward cookie người dùng
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
