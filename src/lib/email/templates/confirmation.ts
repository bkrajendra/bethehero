export interface ConfirmationParams {
  fullName: string;
  eventName: string;
  venue: string;
  address: string;
  startAt: Date;
  badgeToken: string;
  loginUrl: string;
  instructionsDos: string[];
  instructionsDonts: string[];
  appUrl: string;
}

export function confirmationEmailHtml(p: ConfirmationParams): string {
  const dateStr = p.startAt.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr = p.startAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const badgeUrl = `${p.appUrl}/badge/${p.badgeToken}`;
  const dosHtml = p.instructionsDos.map(d => `<li style="margin-bottom:6px;">${d}</li>`).join("");
  const dontsHtml = p.instructionsDonts.map(d => `<li style="margin-bottom:6px;">${d}</li>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
  <tr><td style="background:#c8102e;padding:32px 40px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:28px;letter-spacing:1px;">You're Registered!</h1>
    <p style="color:#ffb3b3;margin:8px 0 0;font-size:15px;">Thank you for signing up to donate blood, ${p.fullName}.</p>
  </td></tr>
  <tr><td style="padding:32px 40px;">
    <p style="font-size:15px;color:#444;margin:0 0 24px;">Your registration for <strong>${p.eventName}</strong> is confirmed. Here are your event details:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f8;border:1px solid #f5c6c6;border-radius:6px;padding:20px;margin-bottom:24px;">
      <tr><td style="padding:8px 0;font-size:14px;color:#666;width:120px;">Date</td><td style="padding:8px 0;font-size:14px;color:#222;font-weight:bold;">${dateStr}</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:#666;">Time</td><td style="padding:8px 0;font-size:14px;color:#222;font-weight:bold;">${timeStr}</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:#666;">Venue</td><td style="padding:8px 0;font-size:14px;color:#222;font-weight:bold;">${p.venue}</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:#666;">Address</td><td style="padding:8px 0;font-size:14px;color:#222;">${p.address}</td></tr>
    </table>
    <div style="text-align:center;margin-bottom:32px;">
      <a href="${badgeUrl}" style="background:#c8102e;color:#fff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:15px;font-weight:bold;display:inline-block;">View My Badge &amp; QR Code</a>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="48%" valign="top" style="padding-right:8px;">
          <h3 style="color:#2e7d32;font-size:14px;margin:0 0 12px;">✅ Do's</h3>
          <ul style="margin:0;padding-left:20px;font-size:13px;color:#444;">${dosHtml}</ul>
        </td>
        <td width="4%"></td>
        <td width="48%" valign="top" style="padding-left:8px;">
          <h3 style="color:#c8102e;font-size:14px;margin:0 0 12px;">❌ Don'ts</h3>
          <ul style="margin:0;padding-left:20px;font-size:13px;color:#444;">${dontsHtml}</ul>
        </td>
      </tr>
    </table>
    <div style="text-align:center;margin-top:32px;">
      <a href="${p.loginUrl}" style="background:#222;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;display:inline-block;">Track My Status</a>
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
