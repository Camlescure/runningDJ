import { NextResponse } from "next/server";

import { getDjSession } from "@/lib/db";

import {
  unseal,
  type SpotifySession,
} from "@/lib/session";

import {
  spotifyAddToQueue,
  spotifyGetQueue,
  validSession,
} from "@/lib/spotify";

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

    const spotifyQueue =
      await spotifyGetQueue(valid.accessToken);

    if (!spotifyQueue) {
      return NextResponse.json({
        currentlyPlaying: null,
        queue: [],
      });
    }

    return NextResponse.json({
      currentlyPlaying: spotifyQueue.currently_playing
        ? {
            id: spotifyQueue.currently_playing.id,
            uri: spotifyQueue.currently_playing.uri,
            name: spotifyQueue.currently_playing.name,
            artists:
              spotifyQueue.currently_playing.artists.map(
                (artist) => artist.name,
              ),
            album: {
              name: spotifyQueue.currently_playing.album.name,
              image:
                spotifyQueue.currently_playing.album
                  .images[0]?.url ?? null,
            },
          }
        : null,

      queue: spotifyQueue.queue
        .slice(0, 5)
        .map((track) => ({
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
    console.error("DJ queue fetch error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to retrieve queue.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
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

    const body = await request.json();

    const uri =
      typeof body?.uri === "string"
        ? body.uri.trim()
        : "";

    if (!uri) {
      return NextResponse.json(
        { error: "Spotify track URI is required." },
        { status: 400 },
      );
    }

    if (!/^spotify:track:[a-zA-Z0-9]+$/.test(uri)) {
      return NextResponse.json(
        { error: "Invalid Spotify track URI." },
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

    await spotifyAddToQueue(
      uri,
      valid.accessToken,
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DJ queue error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to add track to queue.",
      },
      { status: 500 },
    );
  }
}