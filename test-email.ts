/**
 * Quick E-Mail test script
 * Sends a test email via Resend to verify the configuration works.
 * 
 * Usage: npx tsx test-email.ts
 */

import "dotenv/config";

async function testEmail() {
  const apiKey = process.env.RESEND_API_KEY;
  const notificationEmail = process.env.NOTIFICATION_EMAIL || "fly@hypejets.com";

  console.log("=== E-Mail Test ===");
  console.log(`RESEND_API_KEY: ${apiKey ? apiKey.substring(0, 8) + "..." : "❌ NICHT GESETZT"}`);
  console.log(`NOTIFICATION_EMAIL: ${notificationEmail}`);
  console.log(`Absender: HYPE Empty Legs <noreply@hypejets.com>`);
  console.log("");

  if (!apiKey) {
    console.error("❌ RESEND_API_KEY ist nicht gesetzt. Bitte in .env konfigurieren.");
    process.exit(1);
  }

  console.log("📧 Sende Test-E-Mail...\n");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "HYPE Empty Legs <noreply@hypejets.com>",
        to: notificationEmail,
        subject: "🧪 Test-E-Mail von HYPE Empty Legs Portal",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111827;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:40px;text-align:center;">
              <p style="margin:0 0 8px;color:#a0a0b0;font-size:13px;letter-spacing:3px;text-transform:uppercase;">HYPE Empty Legs</p>
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">Test-E-Mail ✅</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;text-align:center;">
              <p style="color:#10b981;font-size:48px;margin:0;">✅</p>
              <h2 style="color:#ffffff;font-size:22px;margin:16px 0 8px;">E-Mail-Versand funktioniert!</h2>
              <p style="color:#d1d5db;font-size:16px;line-height:1.6;">
                Diese Test-E-Mail bestätigt, dass der E-Mail-Versand über Resend korrekt konfiguriert ist.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;background:#1a1a2e;border-radius:12px;">
                <tr>
                  <td style="padding:20px 24px;border-bottom:1px solid #2a2a4a;">
                    <p style="margin:0 0 4px;color:#6b7280;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Zeitpunkt</p>
                    <p style="margin:0;color:#ffffff;font-size:15px;">${new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 24px;border-bottom:1px solid #2a2a4a;">
                    <p style="margin:0 0 4px;color:#6b7280;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Absender-Domain</p>
                    <p style="margin:0;color:#ffffff;font-size:15px;">hypejets.com</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;color:#6b7280;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Provider</p>
                    <p style="margin:0;color:#ffffff;font-size:15px;">Resend</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;text-align:center;border-top:1px solid #1f2937;">
              <p style="margin:0;color:#4b5563;font-size:12px;">HYPE Empty Legs Portal · Test-Nachricht</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("✅ E-Mail erfolgreich gesendet!");
      console.log(`   ID: ${data.id}`);
      console.log(`   An: ${notificationEmail}`);
      console.log("");
      console.log("👉 Bitte Posteingang von", notificationEmail, "prüfen (auch Spam-Ordner).");
    } else {
      console.error("❌ Fehler beim E-Mail-Versand:");
      console.error(`   Status: ${response.status}`);
      console.error(`   Antwort:`, JSON.stringify(data, null, 2));

      if (data.statusCode === 403) {
        console.error("\n💡 Mögliche Ursachen:");
        console.error("   - Die Domain 'hypejets.com' ist nicht bei Resend verifiziert");
        console.error("   - Der API-Key hat keine Berechtigung für diese Domain");
      }
      if (data.statusCode === 422) {
        console.error("\n💡 Mögliche Ursachen:");
        console.error("   - Ungültige E-Mail-Adresse");
        console.error("   - Domain nicht verifiziert bei Resend");
      }
    }
  } catch (error) {
    console.error("❌ Netzwerkfehler:", error);
  }
}

testEmail();
