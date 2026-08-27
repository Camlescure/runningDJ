import { NextResponse } from "next/server";

import { getDjSession } from "@/lib/db";
import {
  spotifySkipNext,
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
  _request: Request,
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

    await spotifySkipNext(
      valid.accessToken,
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DJ skip error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to skip track.",
      },
      { status: 500 },
    );
  }
}