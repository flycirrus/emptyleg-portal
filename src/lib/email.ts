import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const baseUrl = process.env.NEXTAUTH_URL || "https://emptylegportal.com";
const FROM_EMAIL = "HYPE Empty Legs <noreply@hypejets.com>";
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || "fly@hypejets.com";

export async function sendInquiryNotification(inquiry: {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  message: string;
  flightRoute: string;
  flightDate: string;
}) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: NOTIFICATION_EMAIL,
    subject: `✈️ Neue Anfrage: ${inquiry.flightRoute}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px 16px 0 0;padding:40px 40px 30px;text-align:center;">
              <p style="margin:0 0 8px;color:#a0a0b0;font-size:13px;letter-spacing:3px;text-transform:uppercase;">HYPE Empty Legs</p>
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">Neue Anfrage ✈️</h1>
            </td>
          </tr>

          <!-- Flight Info -->
          <tr>
            <td style="background:#111827;padding:30px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#1e3a5f,#1a2a4a);border-radius:12px;padding:24px;text-align:center;">
                    <p style="margin:0 0 4px;color:#6b8cba;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Flug</p>
                    <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${inquiry.flightRoute}</p>
                    <p style="margin:8px 0 0;color:#93c5fd;font-size:15px;">📅 ${inquiry.flightDate}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Customer Info -->
          <tr>
            <td style="background:#111827;padding:0 40px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;border-bottom:1px solid #2a2a4a;">
                    <p style="margin:0 0 4px;color:#6b7280;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Name</p>
                    <p style="margin:0;color:#ffffff;font-size:16px;font-weight:600;">${inquiry.customerName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 24px;border-bottom:1px solid #2a2a4a;">
                    <p style="margin:0 0 4px;color:#6b7280;font-size:11px;letter-spacing:1px;text-transform:uppercase;">E-Mail</p>
                    <p style="margin:0;color:#60a5fa;font-size:16px;">
                      <a href="mailto:${inquiry.customerEmail}" style="color:#60a5fa;text-decoration:none;">${inquiry.customerEmail}</a>
                    </p>
                  </td>
                </tr>
                ${inquiry.customerPhone ? `
                <tr>
                  <td style="padding:20px 24px;border-bottom:1px solid #2a2a4a;">
                    <p style="margin:0 0 4px;color:#6b7280;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Telefon</p>
                    <p style="margin:0;color:#ffffff;font-size:16px;">
                      <a href="tel:${inquiry.customerPhone}" style="color:#ffffff;text-decoration:none;">${inquiry.customerPhone}</a>
                    </p>
                  </td>
                </tr>` : ""}
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 8px;color:#6b7280;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Nachricht</p>
                    <p style="margin:0;color:#d1d5db;font-size:15px;line-height:1.6;">${inquiry.message}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="background:#111827;padding:0 40px 40px;text-align:center;">
              <a href="${baseUrl}/admin/inquiries" 
                 style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:10px;font-size:16px;font-weight:600;letter-spacing:0.5px;">
                Im Portal ansehen →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0d0d1a;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
              <p style="margin:0;color:#4b5563;font-size:12px;">HYPE Empty Legs Portal · Automatische Benachrichtigung</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });
}

export async function sendApprovalNotification(userEmail: string, userName: string) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: userEmail,
    subject: "✅ Dein Account wurde aktiviert",
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111827;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;">Willkommen, ${userName}! 🎉</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;text-align:center;">
              <p style="color:#d1d5db;font-size:16px;line-height:1.6;">Dein HYPE Empty Legs Account wurde aktiviert. Du kannst dich jetzt einloggen und verfügbare Flüge ansehen.</p>
              <a href="${baseUrl}/login" style="display:inline-block;margin-top:24px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:10px;font-size:16px;font-weight:600;">
                Jetzt einloggen →
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;text-align:center;border-top:1px solid #1f2937;">
              <p style="margin:0;color:#4b5563;font-size:12px;">HYPE Empty Legs Portal</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });
}

export async function sendNewUserNotification(userName: string, userEmail: string) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: NOTIFICATION_EMAIL,
    subject: `👤 Neuer User: ${userName}`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111827;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;">Neue Registrierung 👤</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="color:#d1d5db;font-size:16px;"><strong style="color:#ffffff;">Name:</strong> ${userName}</p>
              <p style="color:#d1d5db;font-size:16px;"><strong style="color:#ffffff;">E-Mail:</strong> ${userEmail}</p>
              <p style="color:#9ca3af;font-size:14px;">Bitte Account im Admin-Bereich prüfen und freischalten.</p>
              <a href="${baseUrl}/admin/users" style="display:inline-block;margin-top:16px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;">
                Zum User-Management →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });
}
