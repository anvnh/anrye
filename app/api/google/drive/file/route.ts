import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('fileId');
  
  if (!fileId) {
    return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
  }

  const cookieHeader = (req as any).headers.get("cookie") || "";
  const rf = cookieHeader.split(/;\s*/).find((x: string) => x.startsWith("gd_refresh="));
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
    res.cookies.set("gd_refresh", "", { path: "/", maxAge: 0 });
    return res;
  }

  const tokenData = await tokenResp.json();
  const accessToken = tokenData.access_token;

  // Now fetch the file from Google Drive
  const fileResp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  if (!fileResp.ok) {
    return NextResponse.json({ error: "FILE_FETCH_FAILED" }, { status: fileResp.status });
  }

  // Return the file as a stream
  const fileBuffer = await fileResp.arrayBuffer();
  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': fileResp.headers.get('content-type') || 'application/octet-stream',
      'Content-Length': fileBuffer.byteLength.toString(),
    },
  });
}
