import { Router, type IRouter, type Request, type Response } from "express";

import { logger } from "../lib/logger.js";
import { erpFetch, getErpUrl, getErpHeaders, parseErpError } from "../lib/erpnext-client.js";
import { validate, contactSchema } from "../lib/validation.js";
import { createRateLimiter } from "../middlewares/rate-limit.js";

const router: IRouter = Router();

// Use the pre-defined contact rate limiter.
const contactRateLimiter = createRateLimiter("contact");

// ─── POST /api/contact ───────────────────────────────────────────────────────────
router.post(
  "/contact",
  contactRateLimiter, // Apply rate limiting first
  validate(contactSchema), // Validate the incoming data
  async (req: Request, res: Response) => {
    const { name, email, phone, message } = req.body as {
      name: string;
      email: string;
      phone: string;
      message: string;
    };

    try {
      const leadPayload = {
        lead_name: name,
        email_id: email,
        mobile_no: phone,
        description: message,
        source: "Website Contact Form",
      };

      const erpResponse = await erpFetch(
        getErpUrl("/api/resource/Lead"),
        {
          method: "POST",
          headers: getErpHeaders(),
          body: JSON.stringify(leadPayload),
        }
      );

      if (!erpResponse.ok) {
        const errorData = await erpResponse.json().catch(() => ({}));
        const errorMessage = parseErpError(errorData as any) || "Failed to create Lead in ERPNext.";
        logger.error({ err: errorData, ERPNextError: errorMessage }, "[POST /api/contact]");
        res.status(erpResponse.status || 500).json({ error: errorMessage });
        return;
      }

      const leadData = (await erpResponse.json()) as { data?: { name?: string } };
      logger.info(
        { lead: leadData.data },
        "[POST /api/contact] Lead created successfully",
      );
      res.status(201).json({ success: true, message: "Thank you! Your message has been sent." });

    } catch (err: any) {
      logger.error({ err, reqId: req.headers["x-request-id"] }, "[POST /api/contact] Unhandled error");
      res.status(err.statusCode || 500).json({
        error: err.message || "Internal server error.",
      });
    }
  }
);

export default router;
