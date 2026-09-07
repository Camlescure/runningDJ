"use client";

import { useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);

  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);

  return Uint8Array.from(
    [...rawData].map((char) => char.charCodeAt(0)),
  );
}

type PushNotificationsProps = {
  sessionId: string;
};

export function PushNotifications({
  sessionId,
}: PushNotificationsProps) {
  const [status, setStatus] = useState<
    "idle" | "loading" | "subscribed" | "denied" | "unsupported" | "error"
  >("idle");

  async function enableNotifications() {
    setStatus("loading");

    try {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setStatus("unsupported");
        return;
      }

      const registration =
        await navigator.serviceWorker.register("/sw.js");

      const permission =
        await Notification.requestPermission();

      if (permission === "denied") {
        setStatus("denied");
        return;
      }

      if (permission !== "granted") {
        setStatus("idle");
        return;
      }

      let subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        const publicKey =
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

        if (!publicKey) {
          throw new Error(
            "NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing",
          );
        }

        subscription =
          await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey:
              urlBase64ToUint8Array(publicKey),
          });
      }

      const response = await fetch(
        "/api/push/subscribe",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            subscription,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          "Unable to save push subscription",
        );
      }

      setStatus("subscribed");
    } catch (error) {
      console.error(
        "[PushNotifications]",
        error,
      );

      setStatus("error");
    }
  }

  if (status === "unsupported") {
    return (
      <article className="rounded-3xl bg-white/5 p-6">
        <p className="text-xs font-bold tracking-widest text-[#8da393]">
          NOTIFICATIONS
        </p>

        <p className="mt-4 text-xl font-bold">
          Notifications unsupported
        </p>

        <p className="mt-1 text-sm text-[#b6c7bb]">
          Your browser does not support push notifications.
        </p>
      </article>
    );
  }

  if (status === "subscribed") {
    return (
      <article className="rounded-3xl bg-white/5 p-6">
        <p className="text-xs font-bold tracking-widest text-[#8da393]">
          NOTIFICATIONS
        </p>

        <p className="mt-4 text-xl font-bold">
          Notifications enabled ✓
        </p>

        <p className="mt-1 text-sm text-[#b6c7bb]">
          You&apos;ll be notified when your DJ starts a track.
        </p>
      </article>
    );
  }

  if (status === "denied") {
    return (
      <article className="rounded-3xl bg-white/5 p-6">
        <p className="text-xs font-bold tracking-widest text-[#8da393]">
          NOTIFICATIONS
        </p>

        <p className="mt-4 text-xl font-bold">
          Notifications blocked
        </p>

        <p className="mt-1 text-sm text-[#b6c7bb]">
          Enable notifications in your browser settings.
        </p>
      </article>
    );
  }

  if (status === "error") {
    return (
      <article className="rounded-3xl bg-white/5 p-6">
        <p className="text-xs font-bold tracking-widest text-[#8da393]">
          NOTIFICATIONS
        </p>

        <p className="mt-4 text-xl font-bold">
          Something went wrong
        </p>

        <button
          onClick={() => void enableNotifications()}
          className="mt-4 rounded-full bg-[#1ed760] px-5 py-2 font-bold text-[#061109]"
        >
          Try again
        </button>
      </article>
    );
  }

  return (
    <article className="rounded-3xl bg-white/5 p-6">
      <p className="text-xs font-bold tracking-widest text-[#8da393]">
        NOTIFICATIONS
      </p>

      <p className="mt-4 text-xl font-bold">
        Get notified when your DJ starts a song
      </p>

      <p className="mt-1 text-sm text-[#b6c7bb]">
        We&apos;ll send a notification when a song chosen by your DJ
        starts playing.
      </p>

      <button
        onClick={() => void enableNotifications()}
        disabled={status === "loading"}
        className="mt-5 rounded-full bg-[#1ed760] px-6 py-3 font-bold text-[#061109] disabled:opacity-50"
      >
        {status === "loading"
          ? "Enabling..."
          : "Enable notifications"}
      </button>
    </article>
  );
}
