import { NextResponse } from "next/server";

import { getDjSession } from "@/lib/db";
import {
  spotifyGet,
  validSession,
  type Playback,
} from "@/lib/spotify";
import { unseal, type SpotifySession } from "@/lib/session";

type Params = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: Params,
) {
  try {
    const { sessionId } = await params;

    const session = getDjSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: "DJ session not found or expired." },
        { status: 404 },
      );
    }

    const spotifySession =
      unseal<SpotifySession>(session.spotifySession);

    if (!spotifySession) {
      return NextResponse.json(
        { error: "Spotify session is invalid." },
        { status: 401 },
      );
    }

    const valid = await validSession(spotifySession);

    const playback =
      await spotifyGet<Playback>(
        "/me/player/currently-playing",
        valid.accessToken,
      );

    if (!playback || !playback.item) {
      return NextResponse.json({
        isPlaying: false,
        track: null,
      });
    }

    return NextResponse.json({
      isPlaying: playback.is_playing,
      progressMs: playback.progress_ms,
      track: {
        id: playback.item.id,
        uri: playback.item.uri,
        name: playback.item.name,
        artists: playback.item.artists.map(
          (artist) => artist.name,
        ),
        album: {
          name: playback.item.album.name,
          image:
            playback.item.album.images[0]?.url ?? null,
        },
      },
    });
  } catch (error) {
    console.error("DJ playback error:", error);

    return NextResponse.json(
      { error: "Unable to retrieve playback." },
      { status: 500 },
    );
  }
}