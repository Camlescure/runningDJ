import { NextResponse } from "next/server";

import { getDjSession } from "@/lib/db";
import {
  spotifyAddToQueue,
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