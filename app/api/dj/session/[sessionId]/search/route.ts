import { NextResponse } from "next/server";

import { getDjSession } from "@/lib/db";
import {
  spotifySearchTracks,
  validSession,
} from "@/lib/spotify";
import {
  unseal,
  type SpotifySession,
} from "@/lib/session";

type Params = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function GET(
  request: Request,
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

    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim();

    if (!query) {
      return NextResponse.json({
        tracks: [],
      });
    }

    if (query.length > 100) {
      return NextResponse.json(
        { error: "Search query is too long." },
        { status: 400 },
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

    const tracks = await spotifySearchTracks(
      query,
      valid.accessToken,
    );

    return NextResponse.json({
      tracks: tracks.map((track) => ({
        id: track.id,
        uri: track.uri,
        name: track.name,
        artists: track.artists.map(
          (artist) => artist.name,
        ),
        album: {
          name: track.album.name,
          image:
            track.album.images[0]?.url ?? null,
        },
      })),
    });
  } catch (error) {
    console.error("DJ search error:", error);

    return NextResponse.json(
      { error: "Spotify search failed." },
      { status: 500 },
    );
  }
}