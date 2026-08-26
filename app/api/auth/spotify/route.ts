import { NextResponse } from "next/server";
import { spotifyConfig } from "@/lib/config";
import { randomValue, seal } from "@/lib/session";
import { challengeFor } from "@/lib/spotify";

export async function GET(request: Request) {
  // Cookies are host-only. Always begin the local OAuth flow on the same
  // 127.0.0.1 host used by Spotify's registered callback.
  if (process.env.NODE_ENV !== "production" && request.headers.get("host")?.startsWith("localhost:")) {
    return NextResponse.redirect("http://127.0.0.1:3000/api/auth/spotify");
  }

  try {
    const { clientId, redirectUri } = spotifyConfig();
    const state = randomValue();
    const verifier = randomValue();
    const url = new URL("https://accounts.spotify.com/authorize");
    url.search = new URLSearchParams({
      response_type: "code", client_id: clientId, redirect_uri: redirectUri,
      scope: "user-read-playback-state user-read-currently-playing user-modify-playback-state",
      state, code_challenge_method: "S256", code_challenge: challengeFor(verifier),
    }).toString();
    const response = NextResponse.redirect(url);
    response.cookies.set("rundj_oauth", seal({ state, verifier }), {
      httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: 600,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/?error=configuration", request.url));
  }
}
