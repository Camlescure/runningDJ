import { NextResponse } from "next/server";

import { getDjSession } from "@/lib/db";
import {
  spotifyPlayTrack,
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

export async function POST(
  request: Request,
  { params }: Params,
) {
  try {
    const { sessionId } = await params;

    const session = getDjSession(sessionId);

    if (!session) {
      return NextResponse.json(
        {
          error:
            "DJ session not found or expired.",
        },
        { status: 404 },
      );
    }

    const body = await request.json();

    const uri =
      typeof body?.uri === "string"
        ? body.uri.trim()
        : "";

    if (
      !/^spotify:track:[a-zA-Z0-9]+$/.test(uri)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid Spotify track URI.",
        },
        { status: 400 },
      );
    }

    const spotifySession =
      unseal<SpotifySession>(
        session.spotifySession,
      );

    if (!spotifySession) {
      return NextResponse.json(
        {
          error:
            "Spotify session is invalid.",
        },
        { status: 401 },
      );
    }

    const valid =
      await validSession(spotifySession);

    await spotifyPlayTrack(
      uri,
      valid.accessToken,
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DJ play-next error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to play track.",
      },
      { status: 500 },
    );
  }
}