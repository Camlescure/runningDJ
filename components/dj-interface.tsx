"use client";

import { useCallback, useEffect, useState } from "react";

type Track = {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  album: {
    name: string;
    image: string | null;
  };
};

type Playback = {
  isPlaying: boolean;
  progressMs: number | null;
  track: Track | null;
};

type QueueResponse = {
  currentlyPlaying: Track | null;
  queue: Track[];
};

type Props = {
  sessionId: string;
};

export function DjInterface({
  sessionId,
}: Props) {
  const [playback, setPlayback] =
    useState<Playback | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);

  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(
    null,
  );

  const [added, setAdded] = useState<string | null>(
    null,
  );

  const [queue, setQueue] = useState<Track[]>([]);
  const [loadingQueue, setLoadingQueue] =
    useState(false);

  const [skipping, setSkipping] =
    useState(false);

  const [error, setError] = useState("");

  async function skip() {
    setSkipping(true);
    setError("");

    try {
      const response = await fetch(
        `/api/dj/session/${sessionId}/skip`,
        {
          method: "POST",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Unable to skip track.",
        );
      }

      await new Promise((resolve) =>
        window.setTimeout(resolve, 500),
      );

      await Promise.all([
        loadPlayback(),
        loadQueue(),
      ]);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to skip track.",
      );
    } finally {
      setSkipping(false);
    }
  }

  const loadPlayback = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/dj/session/${sessionId}/playback`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          "Unable to retrieve playback.",
        );
      }

      const data = await response.json();

      setPlayback(data);
    } catch {
      setError(
        "Unable to retrieve the runner's playback.",
      );
    }
  }, [sessionId]);

  const loadQueue = useCallback(async () => {
    try {
      setLoadingQueue(true);

      const response = await fetch(
        `/api/dj/session/${sessionId}/queue`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          "Unable to retrieve queue.",
        );
      }

      const data: QueueResponse =
        await response.json();

      setQueue(data.queue);
    } catch {
      setError(
        "Unable to retrieve the runner's queue.",
      );
    } finally {
      setLoadingQueue(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadPlayback();
    void loadQueue();

    const interval = window.setInterval(() => {
      void loadPlayback();
      void loadQueue();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadPlayback, loadQueue]);

  async function search() {
    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      return;
    }

    setSearching(true);
    setError("");

    try {
      const response = await fetch(
        `/api/dj/session/${sessionId}/search?q=${encodeURIComponent(trimmed)}`,
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Search failed.",
        );
      }

      setResults(data.tracks);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Search failed.",
      );
    } finally {
      setSearching(false);
    }
  }

  async function addToQueue(track: Track) {
    setAdding(track.id);
    setAdded(null);
    setError("");

    try {
      const response = await fetch(
        `/api/dj/session/${sessionId}/queue`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: track.id,
            uri: track.uri,
            name: track.name,
            artists: track.artists,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Unable to add track to queue.",
        );
      }

      setAdded(track.id);

      await loadQueue();

      window.setTimeout(() => {
        setAdded((current) =>
          current === track.id ? null : current,
        );
      }, 2000);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to add track.",
      );
    } finally {
      setAdding(null);
    }
  }

  const currentTrack = playback?.track;

  return (
    <div className="mt-10 space-y-6">
      {/* NOW PLAYING */}
      <section className="rounded-3xl bg-white/5 p-6">
        <p className="text-xs font-bold tracking-widest text-[#8da393]">
          NOW PLAYING
        </p>

        {currentTrack ? (
          <div className="mt-5 flex gap-4">
            {currentTrack.album.image && (
              <img
                src={currentTrack.album.image}
                alt=""
                className="h-24 w-24 rounded-2xl object-cover"
              />
            )}

            <div className="min-w-0">
              <h2 className="truncate text-2xl font-black">
                {currentTrack.name}
              </h2>

              <p className="mt-1 text-[#b6c7bb]">
                {currentTrack.artists.join(", ")}
              </p>

              <p className="mt-3 text-sm text-[#8da393]">
                {playback?.isPlaying
                  ? "▶ Playing"
                  : "Ⅱ Paused"}
              </p>

              <button
                onClick={() => void skip()}
                disabled={
                  skipping ||
                  !currentTrack
                }
                className="mt-4 rounded-full border border-white/10 px-4 py-2 text-sm font-bold transition hover:bg-white/10 disabled:opacity-50"
              >
                {skipping
                  ? "Skipping..."
                  : "⏭ Skip"}
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-5 text-[#b6c7bb]">
            The runner isn't playing anything right now.
          </p>
        )}
      </section>

      {/* UP NEXT */}
      <section className="rounded-3xl bg-white/5 p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold tracking-widest text-[#8da393]">
            UP NEXT
          </p>

          {loadingQueue && (
            <span className="text-xs text-[#6f8176]">
              Updating...
            </span>
          )}
        </div>

        {queue.length > 0 ? (
          <div className="mt-4 divide-y divide-white/5">
            {queue.map((track, index) => (
              <div
                key={`${track.id}-${index}`}
                className="flex items-center gap-3 py-3"
              >
                <span className="w-5 shrink-0 text-sm font-bold text-[#6f8176]">
                  {index + 1}
                </span>

                {track.album.image && (
                  <img
                    src={track.album.image}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-xl object-cover"
                  />
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {track.name}
                  </p>

                  <p className="truncate text-sm text-[#8da393]">
                    {track.artists.join(", ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[#8da393]">
            Nothing queued yet.
          </p>
        )}
      </section>

      {/* SEARCH */}
      <section className="rounded-3xl bg-white/5 p-6">
        <p className="text-xs font-bold tracking-widest text-[#8da393]">
          SEARCH SPOTIFY
        </p>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void search();
          }}
        >
          <input
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Search a song or artist..."
            className="min-w-0 flex-1 rounded-full border border-white/10 bg-black/20 px-5 py-3 text-white outline-none placeholder:text-[#6f8176] focus:border-[#1ed760]"
          />

          <button
            type="submit"
            disabled={
              searching || !query.trim()
            }
            className="rounded-full bg-[#1ed760] px-5 py-3 font-bold text-[#061109] disabled:opacity-50"
          >
            {searching ? "..." : "Search"}
          </button>
        </form>
      </section>

      {/* RESULTS */}
      {results.length > 0 && (
        <section className="space-y-3">
          {results.map((track) => (
            <article
              key={track.id}
              className="flex items-center gap-4 rounded-2xl bg-white/5 p-4"
            >
              {track.album.image && (
                <img
                  src={track.album.image}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-xl object-cover"
                />
              )}

              <div className="min-w-0 flex-1">
                <h3 className="truncate font-bold">
                  {track.name}
                </h3>

                <p className="truncate text-sm text-[#b6c7bb]">
                  {track.artists.join(", ")}
                </p>
              </div>

              <button
                onClick={() =>
                  void addToQueue(track)
                }
                disabled={
                  adding === track.id ||
                  added === track.id
                }
                className="shrink-0 rounded-full bg-[#1ed760] px-4 py-2 text-sm font-bold text-[#061109] disabled:opacity-50"
              >
                {adding === track.id
                  ? "Adding..."
                  : added === track.id
                    ? "✓ Added"
                    : "+ Add"}
              </button>
            </article>
          ))}
        </section>
      )}

      {query.trim() &&
        !searching &&
        results.length === 0 && (
          <p className="text-center text-sm text-[#8da393]">
            No tracks found.
          </p>
        )}

      {error && (
        <div className="rounded-2xl bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
