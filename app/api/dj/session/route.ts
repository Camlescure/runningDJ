import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createDjSession } from "@/lib/db";
import { seal, unseal, type SpotifySession } from "@/lib/session";
import { validSession, spotifyGet, type Profile } from "@/lib/spotify";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    const rawSession = cookieStore.get("rundj_session")?.value;

    if (!rawSession) {
      return NextResponse.json(
        { error: "You must be connected to Spotify." },
        { status: 401 },
      );
    }

    const spotifySession = unseal<SpotifySession>(rawSession);

    if (!spotifySession) {
      return NextResponse.json(
        { error: "Invalid Spotify session." },
        { status: 401 },
      );
    }

    const valid = await validSession(spotifySession);

    const profile = await spotifyGet<Profile>(
      "/me",
      valid.accessToken,
    );

    if (!profile?.id) {
      return NextResponse.json(
        { error: "Unable to identify Spotify account." },
        { status: 401 },
      );
    }

    const session = createDjSession(
      profile.id,
      seal(valid),
    );

    const origin = process.env.APP_URL || new URL(request.url).origin;

    return NextResponse.json({
      sessionId: session.id,
      url: `${origin}/dj/${session.id}`,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error("Failed to create DJ session:", error);

    return NextResponse.json(
      { error: "Unable to create DJ session." },
      { status: 500 },
    );
  }
}
