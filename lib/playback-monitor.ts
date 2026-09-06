import {
  getActiveDjSessionIds,
  getDjSession,
  getDjMember,
  getPlaybackState,
  getLatestDjTrackAction,
  setPlaybackState,
} from "@/lib/db";

import {
  spotifyGet,
  validSession,
  type Playback,
} from "@/lib/spotify";

import {
  unseal,
  type SpotifySession,
} from "@/lib/session";

const POLL_INTERVAL = 5000;

let monitorStarted = false;

async function checkSession(sessionId: string) {
  const session = getDjSession(sessionId);

  if (!session) {
    return;
  }

  const spotifySession =
    unseal<SpotifySession>(session.spotifySession);

  if (!spotifySession) {
    console.error(
      `[PlaybackMonitor] Invalid Spotify session: ${sessionId}`,
    );
    return;
  }

  try {
    const valid = await validSession(spotifySession);

    const playback =
      await spotifyGet<Playback>(
        "/me/player/currently-playing",
        valid.accessToken,
      );

    if (!playback?.item) {
      return;
    }

    const currentTrackId = playback.item.id;

    const previousState =
      getPlaybackState(sessionId);

    // First observation:
    // remember the current track without triggering an event.
    if (!previousState) {
      setPlaybackState(
        sessionId,
        currentTrackId,
      );

      console.log(
        `[PlaybackMonitor] Initial track: ${playback.item.name}`,
      );

      return;
    }

    // The track changed.
    if (previousState.trackId !== currentTrackId) {
      setPlaybackState(
        sessionId,
        currentTrackId,
      );

      // We only consider the track as "started"
      // when Spotify says it is actually playing.
      if (playback.is_playing) {
        console.log(
          `[PlaybackMonitor] TRACK STARTED: ${playback.item.name} — ${playback.item.artists
            .map((artist) => artist.name)
            .join(", ")}`,
        );

        const djAction =
          getLatestDjTrackAction(
            sessionId,
            currentTrackId,
          );

        if (!djAction) {
          console.log(
            `[PlaybackMonitor] No RunDJ DJ attribution for track ${currentTrackId}`,
          );

          return;
        }

        const dj = getDjMember(
          sessionId,
          djAction.djId,
        );

        if (!dj) {
          console.log(
            `[PlaybackMonitor] DJ ${djAction.djId} not found`,
          );

          return;
        }

        console.log(
          `[PlaybackMonitor] DJ ATTRIBUTION: ${dj.name}`,
        );
      }
    }
  } catch (error) {
    console.error(
      `[PlaybackMonitor] Error checking session ${sessionId}:`,
      error,
    );
  }
}

async function checkAllSessions() {
  const sessionIds =
    getActiveDjSessionIds();

  for (const sessionId of sessionIds) {
    await checkSession(sessionId);
  }
}

export function startPlaybackMonitor() {
  if (monitorStarted) {
    return;
  }

  monitorStarted = true;

  console.log(
    `[PlaybackMonitor] Starting (${POLL_INTERVAL}ms interval)`,
  );

  void checkAllSessions();

  setInterval(() => {
    void checkAllSessions();
  }, POLL_INTERVAL);
}
