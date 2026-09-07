import { NextResponse } from "next/server";

import {
  createPushSubscription,
  getDjSession,
} from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const sessionId =
      typeof body?.sessionId === "string"
        ? body.sessionId
        : "";

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required." },
        { status: 400 },
      );
    }

    const session = getDjSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: "Session not found or expired." },
        { status: 404 },
      );
    }

    const endpoint = body?.subscription?.endpoint;
    const p256dh = body?.subscription?.keys?.p256dh;
    const auth = body?.subscription?.keys?.auth;

    if (
      typeof endpoint !== "string" ||
      typeof p256dh !== "string" ||
      typeof auth !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid push subscription." },
        { status: 400 },
      );
    }

    const subscription = createPushSubscription(
      sessionId,
      {
        endpoint,
        p256dh,
        auth,
      },
    );

    return NextResponse.json({
      subscription,
    });
  } catch (error) {
    console.error(
      "Push subscription error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to save push subscription.",
      },
      { status: 500 },
    );
  }
}
