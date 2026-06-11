export interface ThankYouParams {
  fullName: string;
  eventName: string;
  certificateUrl: string;
  appUrl: string;
}

export function thankYouEmailHtml(p: ThankYouParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
  <tr><td style="background:#c8102e;padding:40px;text-align:center;">
    <div style="font-size:48px;margin-bottom:12px;">🦸</div>
    <h1 style="color:#fff;margin:0;font-size:30px;letter-spacing:1px;">You're a Hero!</h1>
    <p style="color:#ffb3b3;margin:10px 0 0;font-size:15px;">Thank you for your incredible gift, ${p.fullName}.</p>
  </td></tr>
  <tr><td style="padding:40px;">
    <p style="font-size:15px;color:#444;margin:0 0 16px;line-height:1.7;">
      Your donation at <strong>${p.eventName}</strong> could save up to <strong>3 lives</strong>.
      The courage and compassion you've shown today will make a real difference to someone in need.
    </p>
    <p style="font-size:15px;color:#444;margin:0 0 32px;line-height:1.7;">
      Your certificate of appreciation is ready. Download it and share it — you've earned it!
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${p.certificateUrl}" style="background:#c8102e;color:#fff;text-decoration:none;padding:16px 40px;border-radius:6px;font-size:16px;font-weight:bold;display:inline-block;">Download My Certificate</a>
    </div>
    <p style="font-size:13px;color:#999;text-align:center;margin:0;">
      You can also access it anytime from <a href="${p.appUrl}" style="color:#c8102e;text-decoration:none;">${p.appUrl}</a>
    </p>
  </td></tr>
  <tr><td style="background:#fff8f8;padding:24px 40px;text-align:center;border-top:2px solid #f5c6c6;">
    <p style="margin:0 0 8px;font-size:14px;color:#c8102e;font-weight:bold;">One donation. Multiple lives. Endless impact.</p>
    <p style="margin:0;font-size:12px;color:#999;">© ${new Date().getFullYear()} BeTheHero. Every drop counts.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
