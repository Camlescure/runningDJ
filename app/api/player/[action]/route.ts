import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { seal, unseal, type SpotifySession } from "@/lib/session";
import { spotifyCommand, validSession } from "@/lib/spotify";

const commands = { play: { path: "/me/player/play", method: "PUT" }, pause: { path: "/me/player/pause", method: "PUT" }, next: { path: "/me/player/next", method: "POST" } } as const;
const trackIdPattern = /^[A-Za-z0-9]{22}$/;

export async function POST(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const sessionValue = (await cookies()).get("rundj_session")?.value;
  const session = sessionValue ? unseal<SpotifySession>(sessionValue) : null;
  if (!session) return NextResponse.json({ message: "Your session has expired. Reconnect Spotify." }, { status: 401 });
  const { action } = await params;
  let path: string; let method: "POST" | "PUT";
  if (action === "queue") { const body = await request.json().catch(() => null) as { trackId?: unknown } | null; const trackId = typeof body?.trackId === "string" ? body.trackId.trim() : ""; if (!trackIdPattern.test(trackId)) return NextResponse.json({ message: "Enter a valid 22-character Spotify Track ID." }, { status: 400 }); path = `/me/player/queue?uri=${encodeURIComponent(`spotify:track:${trackId}`)}`; method = "POST"; }
  else { const command = commands[action as keyof typeof commands]; if (!command) return NextResponse.json({ message: "Unknown player command." }, { status: 404 }); path = command.path; method = command.method; }
  try { const valid = await validSession(session); await spotifyCommand(path, method, valid.accessToken); const response = NextResponse.json({ message: action === "queue" ? "Track added to the Spotify queue." : "Command sent to Spotify." }); response.cookies.set("rundj_session", seal(valid), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 2592000 }); return response; } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Spotify command failed." }, { status: 502 }); }
}
