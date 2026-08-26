import { NextRequest, NextResponse } from "next/server";
import { spotifyConfig } from "@/lib/config";
import { exchangeCode } from "@/lib/spotify";
import { seal, unseal } from "@/lib/session";

function appUrl(path: string) {
  return new URL(path, new URL(spotifyConfig().redirectUri).origin);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const transaction = unseal<{ state: string; verifier: string }>(request.cookies.get("rundj_oauth")?.value ?? "");

  if (!code || !state || !transaction || state !== transaction.state) {
    console.warn("Spotify OAuth callback rejected: missing or invalid state transaction.");
    return NextResponse.redirect(appUrl("/?error=oauth-state"));
  }

  try {
    const session = await exchangeCode(code, transaction.verifier);
    const response = NextResponse.redirect(appUrl("/dashboard"));
    response.cookies.delete("rundj_oauth");
    response.cookies.set("rundj_session", seal(session), {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Spotify OAuth token exchange failed:", message);
    return NextResponse.redirect(appUrl("/?error=spotify-token"));
  }
}
