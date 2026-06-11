import webpush from "web-push";

const subject = process.env.VAPID_SUBJECT;
const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (!subject || !publicKey || !privateKey) {
  throw new Error("Missing required VAPID environment variables");
}

webpush.setVapidDetails(subject, publicKey, privateKey);

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string },
): Promise<void> {
  await webpush.sendNotification(
    { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
    JSON.stringify(payload),
  );
}
