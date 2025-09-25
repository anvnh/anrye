import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyValue, parseState } from "@/app/lib/authCookies";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const appOrigin = url.origin;
    const redirectUri = `${appOrigin}/api/auth/google/drive/callback`;

    const code = url.searchParams.get("code");
    const stateFromGoogle = url.searchParams.get("state") || "";

    // --- Read & validate oauth_state_drive cookie ---
    const cookieStore = await cookies(); // NOTE: await because cookies() returns a Promise in your Next version
    const signedState = cookieStore.get("oauth_state_drive")?.value || "";

    if (!signedState) {
        return NextResponse.redirect(`${appOrigin}?auth_error=missing_state_cookie`);
    }

    const rawState = verifyValue(signedState, process.env.JWT_SECRET!);
    if (!rawState) {
        const r = NextResponse.redirect(`${appOrigin}?auth_error=bad_state_sig`);
        r.cookies.set("oauth_state_drive", "", { path: "/", maxAge: 0 });
        return r;
    }

    const parsed = parseState(rawState); // { uuid, timestamp, origin }
    if (!parsed) {
        const r = NextResponse.redirect(`${appOrigin}?auth_error=bad_state_parse`);
        r.cookies.set("oauth_state_drive", "", { path: "/", maxAge: 0 });
        return r;
    }

    // TTL 10 phút
    if (Date.now() - parsed.timestamp > 10 * 60 * 1000) {
        const r = NextResponse.redirect(`${appOrigin}?auth_error=state_expired`);
        r.cookies.set("oauth_state_drive", "", { path: "/", maxAge: 0 });
        return r;
    }

    if (!stateFromGoogle || parsed.uuid !== stateFromGoogle) {
        const r = NextResponse.redirect(`${appOrigin}?auth_error=state_mismatch`);
        r.cookies.set("oauth_state_drive", "", { path: "/", maxAge: 0 });
        return r;
    }

    if (!code) {
        const r = NextResponse.redirect(`${appOrigin}?auth_error=missing_code`);
        r.cookies.set("oauth_state_drive", "", { path: "/", maxAge: 0 });
        return r;
    }

    // --- Exchange code -> tokens ---
    const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
        }),
    });

    if (!tokenResp.ok) {
        const r = NextResponse.redirect(`${appOrigin}?auth_error=token_exchange_failed`);
        r.cookies.set("oauth_state_drive", "", { path: "/", maxAge: 0 });
        return r;
    }

    const tokens = await tokenResp.json() as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        id_token?: string;
        scope?: string;
        token_type?: string;
    };

    // --- Prepare redirect back to original path ---
    const returnPath = parsed.origin || "/";
    const dest = `${appOrigin}${returnPath.startsWith("/") ? returnPath : "/"}?auth_success=true`;

    const res = NextResponse.redirect(dest);

    // Store/keep refresh token in HttpOnly cookie
    // If Google doesn't return a new refresh_token, keep the existing one if present
    const existingRefresh = cookieStore.get("gd_refresh")?.value || null;
    const refreshToStore = tokens.refresh_token || existingRefresh || null;
    if (refreshToStore) {
        res.cookies.set("gd_refresh", refreshToStore, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 180, // 180 days
        });
    }

    // Clear oauth_state_drive cookie
    res.cookies.set("oauth_state_drive", "", { path: "/", maxAge: 0 });

    return res;
}
