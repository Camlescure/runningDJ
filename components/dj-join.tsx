"use client";

import { useState } from "react";
import { DjInterface } from "./dj-interface";

type DjJoinProps = {
  sessionId: string;
};

export default function DjJoin({ sessionId }: DjJoinProps) {
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin(event: React.FormEvent) {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Please enter your DJ name.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/dj/session/${sessionId}/join`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: trimmedName,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to join the session.",
        );
      }

      setJoined(true);
    } catch (error) {
      console.error("Failed to join DJ session:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to join the session.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (joined) {
    return <DjInterface sessionId={sessionId} />;
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">
            YOU&apos;RE THE DJ 🎧
          </h1>

          <p className="mt-3 text-gray-500">
            Choose a name so the runner knows who picked each song.
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label
              htmlFor="dj-name"
              className="block text-sm font-medium mb-2"
            >
              What&apos;s your name?
            </label>

            <input
              id="dj-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Camille"
              maxLength={30}
              autoFocus
              disabled={loading}
              className="w-full rounded-lg border px-4 py-3"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full rounded-lg px-4 py-3 font-semibold disabled:opacity-50"
          >
            {loading ? "Joining..." : "JOIN SESSION"}
          </button>
        </form>
      </div>
    </main>
  );
}
