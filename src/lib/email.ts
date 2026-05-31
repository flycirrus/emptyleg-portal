import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export async function sendInquiryNotification(inquiry: {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  message: string;
  flightRoute: string;
  flightDate: string;
}) {
  const notificationEmail =
    process.env.NOTIFICATION_EMAIL || "fly@hypejets.com";

  await transporter.sendMail({
    from: `"HYPE Empty Legs" <${process.env.SMTP_USER || "noreply@hypejets.com"}>`,
    to: notificationEmail,
    subject: `New Inquiry: ${inquiry.flightRoute}`,
    html: `
      <h2>New Empty Leg Inquiry</h2>
      <p><strong>Flight:</strong> ${inquiry.flightRoute}</p>
      <p><strong>Date:</strong> ${inquiry.flightDate}</p>
      <hr/>
      <p><strong>Name:</strong> ${inquiry.customerName}</p>
      <p><strong>Email:</strong> ${inquiry.customerEmail}</p>
      <p><strong>Phone:</strong> ${inquiry.customerPhone || "N/A"}</p>
      <p><strong>Message:</strong></p>
      <p>${inquiry.message}</p>
    `,
  });
}

export async function sendApprovalNotification(userEmail: string, userName: string) {
  await transporter.sendMail({
    from: `"HYPE Empty Legs" <${process.env.SMTP_USER || "noreply@hypejets.com"}>`,
    to: userEmail,
    subject: "Your account has been approved",
    html: `
      <h2>Welcome, ${userName}!</h2>
      <p>Your HYPE Empty Legs account has been approved. You can now log in and view available flights.</p>
      <p><a href="${baseUrl}/login">Log in now</a></p>
    `,
  });
}

export async function sendNewUserNotification(userName: string, userEmail: string) {
  const notificationEmail =
    process.env.NOTIFICATION_EMAIL || "fly@hypejets.com";

  await transporter.sendMail({
    from: `"HYPE Empty Legs" <${process.env.SMTP_USER || "noreply@hypejets.com"}>`,
    to: notificationEmail,
    subject: `New user registration: ${userName}`,
    html: `
      <h2>New User Registration</h2>
      <p><strong>Name:</strong> ${userName}</p>
      <p><strong>Email:</strong> ${userEmail}</p>
      <p>Please review and approve this account in the admin dashboard.</p>
      <p><a href="${baseUrl}/admin/users">Go to User Management</a></p>
    `,
  });
}
