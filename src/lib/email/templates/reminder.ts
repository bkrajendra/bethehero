export interface ReminderParams {
  fullName: string;
  eventName: string;
  venue: string;
  startAt: Date;
  badgeToken: string;
  appUrl: string;
}

export function reminderEmailHtml(p: ReminderParams): string {
  const dateStr = p.startAt.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Kolkata" });
  const timeStr = p.startAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
  const badgeUrl = `${p.appUrl}/badge/${p.badgeToken}`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
  <tr><td style="background:#c8102e;padding:32px 40px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:26px;">Donation Drive Tomorrow! 🩸</h1>
    <p style="color:#ffb3b3;margin:8px 0 0;font-size:15px;">Hi ${p.fullName}, we're looking forward to seeing you!</p>
  </td></tr>
  <tr><td style="padding:32px 40px;">
    <p style="font-size:15px;color:#444;margin:0 0 20px;"><strong>${p.eventName}</strong> is tomorrow. Here's a quick reminder of the details:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f8;border:1px solid #f5c6c6;border-radius:6px;padding:20px;margin-bottom:24px;">
      <tr><td style="padding:8px 0;font-size:14px;color:#666;width:100px;">Date</td><td style="padding:8px 0;font-size:14px;color:#222;font-weight:bold;">${dateStr}</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:#666;">Time</td><td style="padding:8px 0;font-size:14px;color:#222;font-weight:bold;">${timeStr}</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:#666;">Venue</td><td style="padding:8px 0;font-size:14px;color:#222;font-weight:bold;">${p.venue}</td></tr>
    </table>
    <h3 style="font-size:15px;color:#333;margin:0 0 12px;">Preparation Tips</h3>
    <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#444;line-height:1.8;">
      <li>Get a good night's sleep tonight</li>
      <li>Drink plenty of water before you come</li>
      <li>Eat a healthy meal 2–3 hours before donating</li>
      <li>Avoid fatty foods and alcohol</li>
      <li>Wear comfortable clothing with sleeves that roll up easily</li>
      <li>Bring a valid photo ID</li>
    </ul>
    <div style="text-align:center;">
      <a href="${badgeUrl}" style="background:#c8102e;color:#fff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:15px;font-weight:bold;display:inline-block;">View My Badge</a>
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
