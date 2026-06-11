export interface FeedbackRequestParams {
  fullName: string;
  feedbackUrl: string;
}

export function feedbackRequestEmailHtml(p: FeedbackRequestParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
  <tr><td style="background:#c8102e;padding:32px 40px;text-align:center;">
    <div style="font-size:40px;margin-bottom:10px;">⭐</div>
    <h1 style="color:#fff;margin:0;font-size:24px;">How was your experience?</h1>
    <p style="color:#ffb3b3;margin:8px 0 0;font-size:15px;">We'd love to hear from you, ${p.fullName}.</p>
  </td></tr>
  <tr><td style="padding:40px;">
    <p style="font-size:15px;color:#444;margin:0 0 20px;line-height:1.7;">
      Thank you for participating in our blood donation drive. Your feedback helps us improve
      the experience for future donors and makes our events even better.
    </p>
    <p style="font-size:15px;color:#444;margin:0 0 32px;line-height:1.7;">
      It only takes 2 minutes. Your response means the world to us!
    </p>
    <div style="text-align:center;">
      <a href="${p.feedbackUrl}" style="background:#c8102e;color:#fff;text-decoration:none;padding:16px 40px;border-radius:6px;font-size:16px;font-weight:bold;display:inline-block;">Give Feedback</a>
    </div>
  </td></tr>
  <tr><td style="background:#f9f9f9;padding:20px 40px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#999;">© ${new Date().getFullYear()} BeTheHero. Every drop counts.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
