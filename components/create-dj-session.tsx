"use client";

import { useState } from "react";
import { PushNotifications } from "@/components/push-notifications";

type CreateSessionResponse = {
  sessionId: string;
  url: string;
  expiresAt: number;
};

export function CreateDjSession() {
  const [loading, setLoading] = useState(false);
  const [session, setSession] =
    useState<CreateSessionResponse | null>(null);
  const [error, setError] = useState("");

  async function createSession() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/dj/session", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to create session.");
      }

      setSession(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to create session.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!session) return;

    await navigator.clipboard.writeText(session.url);
  }

  return (
    <section className="mt-5 rounded-3xl bg-white/5 p-6">
      <p className="text-xs font-bold tracking-widest text-[#8da393]">
        DJ SESSION
      </p>

      <h2 className="mt-3 text-2xl font-bold">
        Let a friend choose your music
      </h2>

      <p className="mt-2 text-sm text-[#b6c7bb]">
        Create a temporary link and give your friend control of your
        music while you run.
      </p>

      {!session ? (
        <button
          onClick={() => void createSession()}
          disabled={loading}
          className="mt-5 rounded-full bg-[#1ed760] px-6 py-3 font-bold text-[#061109] disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create DJ session"}
        </button>
      ) : (
        <div className="mt-5 space-y-3">
          <PushNotifications sessionId={session.sessionId} />

          <div className="rounded-2xl border border-white/10 bg-[#07140f] p-4">
            <p className="text-xs text-[#8da393]">
              SHARE THIS LINK
            </p>

            <p className="mt-2 break-all text-sm">
              {session.url}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void copyLink()}
              className="rounded-full bg-[#1ed760] px-5 py-2 font-bold text-[#061109]"
            >
              Copy link
            </button>

            <a
              href={session.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[#1ed760] px-5 py-2 font-bold text-[#1ed760]"
            >
              Open DJ view
            </a>
          </div>

          <p className="text-xs text-[#8da393]">
            Session expires in 3 hours.
          </p>
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

