import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const region = process.env.AWS_SES_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const fromEmail = process.env.SES_FROM_EMAIL;

if (!region || !accessKeyId || !secretAccessKey || !fromEmail) {
  throw new Error("Missing required AWS SES environment variables");
}

const sesClient = new SESClient({
  region,
  credentials: { accessKeyId, secretAccessKey },
});

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  await sesClient.send(new SendEmailCommand({
    Source: fromEmail,
    Destination: { ToAddresses: [params.to] },
    Message: {
      Subject: { Data: params.subject, Charset: "UTF-8" },
      Body: {
        Html:  { Data: params.html, Charset: "UTF-8" },
        ...(params.text ? { Text: { Data: params.text, Charset: "UTF-8" } } : {}),
      },
    },
  }));
}
