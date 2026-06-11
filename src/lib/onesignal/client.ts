const APP_ID = process.env.ONESIGNAL_APP_ID;
const API_KEY = process.env.ONESIGNAL_REST_API_KEY;

if (!APP_ID || !API_KEY) {
  throw new Error("Missing ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY environment variables");
}

async function post(payload: Record<string, unknown>) {
  const res = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${API_KEY}`,
    },
    body: JSON.stringify({ app_id: APP_ID, ...payload }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`OneSignal error ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json();
}

/** Send a transactional email via OneSignal. */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  await post({
    email_subject: params.subject,
    email_body: params.html,
    include_email_tokens: [params.to],
  });
}

/**
 * Send a web push notification to a specific donor.
 * externalUserId must match the id set via OneSignal.login() on the frontend.
 */
export async function sendPush(params: {
  externalUserId: string;
  title: string;
  body: string;
  url?: string;
}): Promise<void> {
  await post({
    headings: { en: params.title },
    contents: { en: params.body },
    include_external_user_ids: [params.externalUserId],
    channel_for_external_user_ids: "push",
    ...(params.url ? { url: params.url } : {}),
  });
}
