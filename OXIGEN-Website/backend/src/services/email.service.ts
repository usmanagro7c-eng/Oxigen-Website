import { sendMail } from "../lib/mailer.js";

/**
 * EmailService — centralized logic for building and sending auth emails.
 */
const emailService = {
  /**
   * Send "Set Password" email after signup.
   */
  async sendSetPasswordEmail(email: string, fullName: string, url: string): Promise<void> {
    const html = this.buildEmailTemplate({
      fullName,
      heading: `Welcome, ${fullName}!`,
      body: "Your OXIGEN account has been created. Click the button below to set your password.",
      buttonText: "Set My Password",
      buttonUrl: url,
      expiry: "24 hours",
      fallbackText: "Or copy this link:",
      fallbackUrl: url,
    });

    await sendMail({
      to: email,
      subject: "Set your OXIGEN password — OXIGEN",
      html,
      erp: { referenceDoctype: "User", referenceName: email },
    });
  },

  /**
   * Send "Reset Password" email for forgot-password flow.
   */
  async sendResetPasswordEmail(email: string, fullName: string, url: string): Promise<void> {
    const html = this.buildEmailTemplate({
      fullName,
      heading: "Reset your password",
      body: `Hi ${fullName}, we received a request to reset your OXIGEN password.`,
      buttonText: "Reset My Password",
      buttonUrl: url,
      expiry: "1 hour",
      fallbackText: "Or copy this link:",
      fallbackUrl: url,
    });

    await sendMail({
      to: email,
      subject: "Reset your OXIGEN password — OXIGEN",
      html,
      erp: { referenceDoctype: "User", referenceName: email },
    });
  },

  /**
   * HTML template wrapper (reused from routes/auth.ts).
   */
  buildEmailTemplate({
    fullName: _fullName,
    heading,
    body,
    buttonText,
    buttonUrl,
    expiry,
    fallbackText,
    fallbackUrl,
  }: {
    fullName: string;
    heading: string;
    body: string;
    buttonText: string;
    buttonUrl: string;
    expiry: string;
    fallbackText: string;
    fallbackUrl: string;
  }): string {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr><td style="background:#16a34a;padding:28px 40px;text-align:center;">
          <span style="font-size:22px;font-weight:700;color:#ffffff;">&#9728; OXIGEN</span>
        </td></tr>
        <tr><td style="padding:40px 40px 32px;">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">${heading}</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">${body}</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${buttonUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;font-size:15px;font-weight:600;padding:14px 36px;border-radius:100px;text-decoration:none;">${buttonText}</a>
          </div>
          <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">
            This link will expire in <strong>${expiry}</strong>. If you did not make this request, ignore this email.
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;" />
          <p style="margin:0;font-size:12px;color:#d1d5db;">
            ${fallbackText}<br/>
            <a href="${fallbackUrl}" style="color:#6b7280;word-break:break-all;font-size:11px;">${fallbackUrl}</a>
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; ${new Date().getFullYear()} OXIGEN. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  },
};

export default emailService;
