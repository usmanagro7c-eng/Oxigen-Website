/**
 * mailer.ts — OXIGEN Email Service
 * Sends email only through ERPNext.
 * Uses ERPNext's configured Outgoing Email Server (Settings > Email > Outgoing Email).
 * No Nodemailer / SMTP config is required.
 */

import { getErpUrl, getErpHeaders, erpFetch} from "./erpnext-client.js";
import { logger } from "./logger.js";

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  erp?: {
    referenceDoctype?: string;
    referenceName?: string;
  };
}

export interface MailResult {
  messageId: string;
  erpLogged: boolean;
}

// ---------------------------------------------------------------------------
// Sender address — uses the outgoing email configured in ERPNext
// Set ERP_SENDER_EMAIL in .env, otherwise the default will be used
// ---------------------------------------------------------------------------
function getSenderEmail(): string {
  return process.env["ERP_SENDER_EMAIL"] ?? "noreply@oxigen.pk";
}

// ---------------------------------------------------------------------------
// sendViaErpNext
// Uses ERPNext's communication.email.make API.
// send_email=1 causes ERPNext to send email via its configured SMTP.
// ---------------------------------------------------------------------------
async function sendViaErpNext(opts: MailOptions): Promise<string> {
  const sender = opts.from ?? `OXIGEN <${getSenderEmail()}>`;

  // Primary: frappe.core.doctype.communication.email.make
  // send_email=1 => ERPNext sends the email using its SMTP configuration
  const body = new URLSearchParams({
    recipients: opts.to,
    sender,
    subject: opts.subject,
    content: opts.html,
    send_email: "1",
    reference_doctype: opts.erp?.referenceDoctype ?? "User",
    reference_name: opts.erp?.referenceName ?? opts.to,
  });

  const res = await erpFetch(
    getErpUrl("/api/method/frappe.core.doctype.communication.email.make"),
    {
      method: "POST",
      headers: {
        ...getErpHeaders(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    }
  );

  if (res.ok) {
    const data = await res.json() as { message?: { name?: string } };
    const commName = data?.message?.name ?? "unknown";
    logger.info({ to: opts.to, subject: opts.subject, commName }, "[mailer] Email sent via ERPNext");
    return commName;
  }

  const errText = await res.text().catch(() => "");
  logger.warn({ status: res.status, errText: errText.slice(0, 300) }, "[mailer] communication.email.make failed");

  // Fallback: frappe.sendmail endpoint
  const body2 = new URLSearchParams({
    recipients: opts.to,
    sender,
    subject: opts.subject,
    message: opts.html,
    now: "1",
  });

  const res2 = await erpFetch(
    getErpUrl("/api/method/frappe.utils.user.send_email"),
    {
      method: "POST",
      headers: {
        ...getErpHeaders(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body2.toString(),
    }
  );

  if (res2.ok) {
    logger.info({ to: opts.to, subject: opts.subject }, "[mailer] Email sent via ERPNext (fallback)");
    return "fallback-sent";
  }

  const err2Text = await res2.text().catch(() => "");
  throw new Error(
    `[mailer] ERPNext email failed. Primary: ${errText.slice(0, 150)} | Fallback: ${err2Text.slice(0, 150)}`
  );
}

// ---------------------------------------------------------------------------
// sendMail — public API (auth.ts aur contact.ts yahi call karte hain)
// ---------------------------------------------------------------------------
export async function sendMail(opts: MailOptions): Promise<MailResult> {
  const messageId = await sendViaErpNext(opts);
  return { messageId, erpLogged: true };
}

// ---------------------------------------------------------------------------
// buildOrderConfirmationEmail — order-placed customer notification
// ---------------------------------------------------------------------------

export interface OrderConfirmationPayload {
  email: string;
  items: { item_code: string; qty: number }[];
  delivery_date?: string;
  addressName?: string;
  shippingAddress?: {
    address_line1: string;
    address_line2?: string;
    city: string;
    state?: string;
    country: string;
    pincode?: string;
    phone?: string;
  };
  defaultWarehouse: string;
  defaultCompany: string;
}

export function buildOrderConfirmationEmail(
  payload: OrderConfirmationPayload,
  orderName: string,
): string {
  const itemRows = payload.items
    .map(
      (it) => `
    <tr>
      <td style="padding:10px;border:1px solid #e5e7eb;">${it.item_code}</td>
      <td style="padding:10px;border:1px solid #e5e7eb;text-align:center;">${it.qty}</td>
    </tr>`,
    )
    .join("");

  const addressHtml = payload.shippingAddress
    ? `
    <table style="width:100%;border-collapse:collapse;margin-top:8px;">
      <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">${payload.shippingAddress.address_line1}${payload.shippingAddress.address_line2 ? `<br/>${payload.shippingAddress.address_line2}` : ""}</td></tr>
      <tr><td style="padding:2px 0;color:#6b7280;font-size:13px;">${payload.shippingAddress.city}${payload.shippingAddress.state ? `, ${payload.shippingAddress.state}` : ""}${payload.shippingAddress.pincode ? ` — ${payload.shippingAddress.pincode}` : ""}</td></tr>
      <tr><td style="padding:2px 0;color:#6b7280;font-size:13px;">${payload.shippingAddress.country}</td></tr>
      ${payload.shippingAddress.phone ? `<tr><td style="padding:2px 0;color:#6b7280;font-size:13px;">Phone: ${payload.shippingAddress.phone}</td></tr>` : ""}
    </table>`
    : payload.addressName
      ? `<p style="color:#6b7280;font-size:13px;">Saved address: ${payload.addressName}</p>`
      : `<p style="color:#6b7280;font-size:13px;">No address provided.</p>`;

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
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Order Confirmed</h1>
          <p style="margin:0 0 4px;font-size:14px;color:#6b7280;">
            Thank you for your order, <strong style="color:#111827;">${payload.email}</strong>!
          </p>
          <p style="margin:0 0 20px;font-size:13px;color:#9ca3af;">
            Order ID: <span style="font-family:monospace;font-weight:600;color:#111827;">${orderName}</span>
          </p>

          <h2 style="margin:0 0 8px;font-size:15px;font-weight:700;color:#111827;">Items Ordered</h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:10px;font-size:12px;color:#6b7280;text-align:left;font-weight:600;">Item Code</th>
                <th style="padding:10px;font-size:12px;color:#6b7280;text-align:center;font-weight:600;">Qty</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <h2 style="margin:20px 0 4px;font-size:15px;font-weight:700;color:#111827;">Shipping Address</h2>
          ${addressHtml}

          <p style="margin:24px 0 0;padding:16px;background:#f0fdf4;border-radius:10px;color:#065f46;font-size:14px;font-weight:500;text-align:center;">
            Our team will contact you shortly to confirm delivery details.
          </p>

          <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;text-align:center;">
            If you have any questions, reply to this email or contact our support team.
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
}

// ---------------------------------------------------------------------------
// verifyMailer — startup ERPNext connectivity check
// ---------------------------------------------------------------------------
export async function verifyMailer(): Promise<void> {
  try {
    const res = await erpFetch(
      getErpUrl("/api/method/frappe.auth.get_logged_user"),
      {
        method: "GET",
        headers: getErpHeaders(),
      }
    );

    if (res.ok) {
      logger.info("[mailer] ERPNext connection verified ✓ (email will be sent through ERPNext)");
    } else {
      logger.warn({ status: res.status }, "[mailer] ERPNext reachable but response was unexpected — email delivery may fail");
    }
  } catch (err) {
    logger.warn({ err }, "[mailer] ERPNext connectivity check failed — email delivery may fail");
  }
}
