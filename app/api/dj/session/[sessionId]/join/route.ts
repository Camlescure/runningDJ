import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  createDjMember,
  getDjSession,
} from "@/lib/db";

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

    const name =
      typeof body?.name === "string"
        ? body.name.trim()
        : "";

    if (!name) {
      return NextResponse.json(
        { error: "DJ name is required." },
        { status: 400 },
      );
    }

    if (name.length > 30) {
      return NextResponse.json(
        { error: "DJ name is too long." },
        { status: 400 },
      );
    }

    const member = createDjMember(
      sessionId,
      name,
    );

    const cookieStore = await cookies();

    cookieStore.set(
      `rundj_dj_${sessionId}`,
      member.id,
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 3 * 60 * 60,
        path: `/`,
      },
    );

    return NextResponse.json({
      dj: member,
    });
  } catch (error) {
    console.error("DJ join error:", error);

    return NextResponse.json(
      { error: "Unable to join DJ session." },
      { status: 500 },
    );
  }
}
