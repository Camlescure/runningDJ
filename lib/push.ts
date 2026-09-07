import webpush from "web-push";

import type { PushSubscription } from "@/lib/db";

const subject = process.env.VAPID_SUBJECT;
const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (!subject || !publicKey || !privateKey) {
  throw new Error("VAPID environment variables are missing.");
}

webpush.setVapidDetails(
  subject,
  publicKey,
  privateKey,
);

export type PushPayload = {
  title: string;
  body: string;
};

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload,
) {
  return webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    JSON.stringify(payload),
  );
}
