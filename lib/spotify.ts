import { createHash } from "crypto";
import { spotifyConfig } from "@/lib/config";
import type { SpotifySession } from "@/lib/session";

export type Profile = {
  display_name: string | null;
  id: string;
};

export type Artist = {
  name: string;
};

export type Album = {
  name: string;
  images: {
    url: string;
    height: number | null;
    width: number | null;
  }[];
};

export type Track = {
  id: string;
  uri: string;
  name: string;
  artists: Artist[];
  album: Album;
};

export type Playback = {
  is_playing: boolean;
  progress_ms: number | null;
  item: Track | null;
};

export type QueueTrack = {
  id: string;
  uri: string;
  name: string;
  artists: {
    name: string;
  }[];
  album: {
    name: string;
    images: {
      url: string;
      height: number | null;
      width: number | null;
    }[];
  };
};

export type SpotifyQueue = {
  currently_playing: QueueTrack | null;
  queue: QueueTrack[];
};

export type Device = {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
};

export type SearchResponse = {
  tracks: {
    items: Track[];
    total: number;
    limit: number;
    offset: number;
  };
};

export const challengeFor = (verifier: string) =>
  createHash("sha256")
    .update(verifier)
    .digest("base64url");

export async function exchangeCode(
  code: string,
  verifier: string,
): Promise<SpotifySession> {
  const { clientId, redirectUri } = spotifyConfig();

  const response = await fetch(
    "https://accounts.spotify.com/api/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
      cache: "no-store",
    },
  );

  const data = await response.json();

  if (
    !response.ok ||
    !data.access_token ||
    !data.refresh_token
  ) {
    throw new Error(
      "Spotify token exchange failed",
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt:
      Date.now() + data.expires_in * 1000,
    scope: data.scope ?? "",
  };
}

export async function validSession(
  s: SpotifySession,
): Promise<SpotifySession> {
  if (s.expiresAt > Date.now() + 60000) {
    return s;
  }

  const { clientId } = spotifyConfig();

  const response = await fetch(
    "https://accounts.spotify.com/api/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "refresh_token",
        refresh_token: s.refreshToken,
      }),
      cache: "no-store",
    },
  );

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(
      "Spotify token refresh failed",
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken:
      data.refresh_token ?? s.refreshToken,
    expiresAt:
      Date.now() + data.expires_in * 1000,
    scope: data.scope ?? s.scope,
  };
}

export async function spotifyGet<T>(
  path: string,
  token: string,
): Promise<T | null> {
  const response = await fetch(
    `https://api.spotify.com/v1${path}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
  );

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      "Spotify data unavailable",
    );
  }

  return response.json() as Promise<T>;
}

export async function spotifyCommand(
  path: string,
  method: "POST" | "PUT",
  token: string,
) {
  const response = await fetch(
    `https://api.spotify.com/v1${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
  );

  if (response.ok) {
    return;
  }

  const body =
    (await response
      .json()
      .catch(() => null)) as {
      error?: {
        message?: string;
      };
    } | null;

  if (response.status === 404) {
    throw new Error(
      "No active Spotify device. Start Spotify and play a track first.",
    );
  }

  if (response.status === 403) {
    throw new Error(
      "Spotify Premium and the playback-control permission are required.",
    );
  }

  throw new Error(
    body?.error?.message ??
      "Spotify could not apply this command.",
  );
}

/**
 * Search Spotify's catalog.
 */
export async function spotifySearchTracks(
  query: string,
  token: string,
): Promise<Track[]> {
  const params = new URLSearchParams({
    q: query,
    type: "track",
    limit: "10",
  });

  const result =
    await spotifyGet<SearchResponse>(
      `/search?${params.toString()}`,
      token,
    );

  return result?.tracks.items ?? [];
}

/**
 * Add a Spotify track to the runner's current queue.
 */
export async function spotifyAddToQueue(
  uri: string,
  token: string,
): Promise<void> {
  const params = new URLSearchParams({
    uri,
  });

  const response = await fetch(
    `https://api.spotify.com/v1/me/player/queue?${params.toString()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
  );

  if (response.ok) {
    return;
  }

  const body =
    (await response
      .json()
      .catch(() => null)) as {
      error?: {
        message?: string;
      };
    } | null;

  if (response.status === 403) {
    throw new Error(
      "Spotify Premium and playback-control permission are required.",
    );
  }

  if (response.status === 404) {
    throw new Error(
      "No active Spotify device. Start Spotify playback first.",
    );
  }

  throw new Error(
    body?.error?.message ??
      "Spotify could not add this track to the queue.",
  );
}

export async function spotifyGetQueue(
  token: string,
): Promise<SpotifyQueue | null> {
  return spotifyGet<SpotifyQueue>(
    "/me/player/queue",
    token,
  );
}

export async function spotifySkipNext(
  token: string,
): Promise<void> {
  const response = await fetch(
    "https://api.spotify.com/v1/me/player/next",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
  );

  if (response.ok) {
    return;
  }

  const body =
    (await response
      .json()
      .catch(() => null)) as {
      error?: {
        message?: string;
      };
    } | null;

  if (response.status === 404) {
    throw new Error(
      "No active Spotify device.",
    );
  }

  if (response.status === 403) {
    throw new Error(
      "Spotify Premium and playback-control permission are required.",
    );
  }

  throw new Error(
    body?.error?.message ??
      "Spotify could not skip to the next track.",
  );
}
