export interface ActivationParams {
  fullName: string;
  activationUrl: string;
  eventName?: string;
  venue?: string;
  address?: string;
  startAt?: Date;
  instructionsDos?: string[];
  instructionsDonts?: string[];
}

export function activationEmailHtml(p: ActivationParams): string {
  const hasEvent = !!(p.eventName && p.startAt);
  const dateStr = hasEvent
    ? p.startAt!.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Kolkata" })
    : null;
  const timeStr = hasEvent
    ? p.startAt!.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })
    : null;

  const dosHtml = (p.instructionsDos ?? []).map(d => `<li style="margin-bottom:6px;">${d}</li>`).join("");
  const dontsHtml = (p.instructionsDonts ?? []).map(d => `<li style="margin-bottom:6px;">${d}</li>`).join("");
  const hasInstructions = dosHtml.length > 0 || dontsHtml.length > 0;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">

  <!-- Header -->
  <tr><td style="background:#c8102e;padding:32px 40px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:26px;letter-spacing:1px;">Activate Your Account</h1>
    <p style="color:#ffb3b3;margin:8px 0 0;font-size:15px;">Hi ${p.fullName}, complete your registration below.</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px 40px;">

    <p style="font-size:15px;color:#444;margin:0 0 24px;line-height:1.6;">
      You've registered for a blood donation drive${p.eventName ? ` — <strong>${p.eventName}</strong>` : ""}.
      Click the button below to activate your account and access your donation status and QR badge.
    </p>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:32px;">
      <a href="${p.activationUrl}"
        style="background:#c8102e;color:#fff;text-decoration:none;padding:16px 40px;border-radius:6px;font-size:16px;font-weight:bold;display:inline-block;letter-spacing:0.3px;">
        Activate My Account →
      </a>
    </div>
    <p style="text-align:center;font-size:12px;color:#999;margin:0 0 32px;">
      This link expires in 24 hours. If you didn't register, you can safely ignore this email.
    </p>

    ${hasEvent ? `
    <!-- Event details -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f8;border:1px solid #f5c6c6;border-radius:6px;padding:20px;margin-bottom:32px;">
      <tr><td colspan="2" style="padding-bottom:12px;font-size:13px;font-weight:bold;color:#c8102e;text-transform:uppercase;letter-spacing:0.5px;">Event Details</td></tr>
      ${dateStr ? `<tr><td style="padding:6px 0;font-size:14px;color:#666;width:100px;">Date</td><td style="padding:6px 0;font-size:14px;color:#222;font-weight:bold;">${dateStr}</td></tr>` : ""}
      ${timeStr ? `<tr><td style="padding:6px 0;font-size:14px;color:#666;">Time</td><td style="padding:6px 0;font-size:14px;color:#222;font-weight:bold;">${timeStr}</td></tr>` : ""}
      ${p.venue ? `<tr><td style="padding:6px 0;font-size:14px;color:#666;">Venue</td><td style="padding:6px 0;font-size:14px;color:#222;font-weight:bold;">${p.venue}</td></tr>` : ""}
      ${p.address ? `<tr><td style="padding:6px 0;font-size:14px;color:#666;">Address</td><td style="padding:6px 0;font-size:14px;color:#222;">${p.address}</td></tr>` : ""}
    </table>` : ""}

    ${hasInstructions ? `
    <!-- Dos and Don'ts -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        ${dosHtml ? `
        <td width="${dontsHtml ? "48%" : "100%"}" valign="top" ${dontsHtml ? 'style="padding-right:8px;"' : ""}>
          <h3 style="color:#2e7d32;font-size:14px;margin:0 0 12px;">✅ Do's before donating</h3>
          <ul style="margin:0;padding-left:20px;font-size:13px;color:#444;">${dosHtml}</ul>
        </td>` : ""}
        ${dosHtml && dontsHtml ? `<td width="4%"></td>` : ""}
        ${dontsHtml ? `
        <td width="${dosHtml ? "48%" : "100%"}" valign="top" ${dosHtml ? 'style="padding-left:8px;"' : ""}>
          <h3 style="color:#c8102e;font-size:14px;margin:0 0 12px;">❌ Don'ts before donating</h3>
          <ul style="margin:0;padding-left:20px;font-size:13px;color:#444;">${dontsHtml}</ul>
        </td>` : ""}
      </tr>
    </table>` : ""}

  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f9f9f9;padding:20px 40px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#999;">© ${new Date().getFullYear()} BeTheHero · Every drop counts.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
