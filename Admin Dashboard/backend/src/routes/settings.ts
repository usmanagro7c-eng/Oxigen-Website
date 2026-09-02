import { Router, type IRouter, type Request, type Response } from "express";
import { erpFetch, getErpUrl, getErpHeaders, parseErpError } from "../lib/erpnext-client.js";
import { logger } from "../lib/logger.js";
import { settingsUpdateSchema, validate } from "../lib/validation.js";

const router: IRouter = Router();

const FALLBACK = {
  company_name: "OxiGen Healthcare",
  website_url: "https://oxigen.pk",
  support_email: "support@oxigen.pk",
  language: "en",
  time_zone: "Asia/Karachi",
  date_format: "DD/MM/YYYY",
  country: "Pakistan",
  number_format: "#,###.##",
  currency: "PKR",
};

function defaultCompany(): string {
  return process.env.DEFAULT_COMPANY?.trim() || "Oxigen";
}

// ---------------------------------------------------------------------------
// Helpers: read ERPNext doctypes that map to our settings shape.
// ---------------------------------------------------------------------------
async function fetchSystemSettings(): Promise<Record<string, unknown>> {
  const res = await erpFetch(
    getErpUrl(
      `/api/resource/System Settings/System Settings?fields=${encodeURIComponent(
        JSON.stringify([
          "language",
          "time_zone",
          "date_format",
          "country",
          "number_format",
        ])
      )}`
    ),
    { headers: getErpHeaders() }
  );
  if (!res.ok) return {};
  const json = (await res.json()) as { data?: Record<string, unknown> };
  return json.data ?? {};
}

async function fetchCompany(): Promise<Record<string, unknown>> {
  const res = await erpFetch(
    getErpUrl(
      `/api/resource/Company/${encodeURIComponent(defaultCompany())}?fields=${encodeURIComponent(
        JSON.stringify(["name", "company_name", "website", "support_email"])
      )}`
    ),
    { headers: getErpHeaders() }
  ).catch(() => null);
  if (!res?.ok) return {};
  const json = (await res.json()) as { data?: Record<string, unknown> };
  return json.data ?? {};
}

async function fetchGlobalDefaults(): Promise<Record<string, unknown>> {
  const res = await erpFetch(
    getErpUrl(
      `/api/resource/Global Defaults/Global Defaults?fields=${encodeURIComponent(
        JSON.stringify(["default_currency", "country"])
      )}`
    ),
    { headers: getErpHeaders() }
  ).catch(() => null);
  if (!res?.ok) return {};
  const json = (await res.json()) as { data?: Record<string, unknown> };
  return json.data ?? {};
}

function buildSettings(sys: Record<string, unknown>, company: Record<string, unknown>, globals: Record<string, unknown>) {
  return {
    organization: {
      company_name: (company["company_name"] as string) || (sys["company_name"] as string) || FALLBACK.company_name,
      website_url: (company["website"] as string) || (sys["website_url"] as string) || FALLBACK.website_url,
      support_email: (company["support_email"] as string) || (sys["support_email"] as string) || FALLBACK.support_email,
    },
    preferences: {
      language: (sys["language"] as string) || FALLBACK.language,
      time_zone: (sys["time_zone"] as string) || FALLBACK.time_zone,
      date_format: (sys["date_format"] as string) || FALLBACK.date_format,
      currency: (globals["default_currency"] as string) || (sys["currency"] as string) || FALLBACK.currency,
      country: (sys["country"] as string) || (globals["country"] as string) || FALLBACK.country,
      number_format: (sys["number_format"] as string) || FALLBACK.number_format,
    },
    notifications: {
      email: true,
      push: true,
      marketing: false,
    },
  };
}

// ---------------------------------------------------------------------------
// GET /api/admin/settings
// Reads organization & preference settings from ERPNext System Settings,
// the Company doctype, and Global Defaults.
// ---------------------------------------------------------------------------
router.get("/admin/settings", async (_req: Request, res: Response) => {
  try {
    const [sys, company, globals] = await Promise.all([
      fetchSystemSettings(),
      fetchCompany(),
      fetchGlobalDefaults(),
    ]);

    res.json({ data: buildSettings(sys, company, globals) });
  } catch (err: any) {
    logger.error({ err }, "[admin/settings.GET]");
    res.status(500).json({ error: err.message || "Internal server error." });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/admin/settings
// Updates settings across ERPNext doctypes. Unknown / unsupported fields are
// written best-effort — core writes are required, optional writes are logged.
// ---------------------------------------------------------------------------
router.put("/admin/settings", validate(settingsUpdateSchema), async (req: Request, res: Response) => {
  try {
    const { organization, preferences, notifications } = req.body;

    let coreFailed: string | null = null;

    // 1) System Settings — language, time zone, date format, country, number format
    const sysPayload: Record<string, unknown> = {};
    if (preferences?.language !== undefined) sysPayload["language"] = preferences.language;
    if (preferences?.time_zone !== undefined) sysPayload["time_zone"] = preferences.time_zone;
    if (preferences?.date_format !== undefined) sysPayload["date_format"] = preferences.date_format;
    if (preferences?.country !== undefined) sysPayload["country"] = preferences.country;
    if (preferences?.number_format !== undefined) sysPayload["number_format"] = preferences.number_format;

    // Best-effort org fields in case System Settings has been customized
    if (organization?.website_url !== undefined) sysPayload["website_url"] = organization.website_url;
    if (organization?.support_email !== undefined) sysPayload["support_email"] = organization.support_email;

    if (Object.keys(sysPayload).length > 0) {
      const sysRes = await erpFetch(
        getErpUrl("/api/resource/System Settings/System Settings"),
        {
          method: "PUT",
          headers: getErpHeaders(),
          body: JSON.stringify(sysPayload),
        }
      );

      if (!sysRes.ok) {
        // Retry with only the guaranteed-standard fields — some ERPNext instances
        // reject unknown fields like website_url / support_email.
        const standardSysPayload: Record<string, unknown> = {};
        for (const key of ["language", "time_zone", "date_format", "country", "number_format"]) {
          if (sysPayload[key] !== undefined) standardSysPayload[key] = sysPayload[key];
        }

        if (Object.keys(standardSysPayload).length > 0) {
          const retryRes = await erpFetch(
            getErpUrl("/api/resource/System Settings/System Settings"),
            {
              method: "PUT",
              headers: getErpHeaders(),
              body: JSON.stringify(standardSysPayload),
            }
          );

          if (!retryRes.ok) {
            const err = (await retryRes.json().catch(() => ({}))) as any;
            coreFailed = parseErpError(err) || `Failed to update settings (HTTP ${retryRes.status}).`;
            logger.error(
              { err, status: retryRes.status, payload: standardSysPayload },
              "[admin/settings.PUT] System Settings update failed"
            );
          }
        }
      }
    }

    // 2) Currency → Global Defaults (default_currency)
    if (preferences?.currency !== undefined) {
      try {
        const globalsRes = await erpFetch(
          getErpUrl("/api/resource/Global Defaults/Global Defaults"),
          {
            method: "PUT",
            headers: getErpHeaders(),
            body: JSON.stringify({ default_currency: preferences.currency }),
          }
        );
        if (!globalsRes.ok) {
          logger.warn(
            { status: globalsRes.status, currency: preferences.currency },
            "[admin/settings.PUT] Global Defaults currency update failed"
          );
        }
      } catch (globErr) {
        logger.warn({ globErr }, "[admin/settings.PUT] Global Defaults update error");
      }
    }

    // 3) Company name → Company doctype
    if (organization?.company_name !== undefined) {
      try {
        const compRes = await erpFetch(
          getErpUrl(`/api/resource/Company/${encodeURIComponent(defaultCompany())}`),
          {
            method: "PUT",
            headers: getErpHeaders(),
            body: JSON.stringify({ company_name: organization.company_name }),
          }
        );
        if (!compRes.ok) {
          logger.warn(
            { status: compRes.status },
            "[admin/settings.PUT] Company name update failed"
          );
        }
      } catch (compErr) {
        logger.warn({ compErr }, "[admin/settings.PUT] Company update error");
      }
    }

    if (coreFailed) {
      res.status(502).json({ error: coreFailed });
      return;
    }

    // Re-fetch the updated settings to return the latest state
    const [sys, company, globals] = await Promise.all([
      fetchSystemSettings(),
      fetchCompany(),
      fetchGlobalDefaults(),
    ]);

    const settings = buildSettings(sys, company, globals);
    if (notifications) {
      settings.notifications = { ...settings.notifications, ...notifications };
    }

    logger.info({ updated: Object.keys({ ...organization, ...preferences }) }, "[admin/settings.PUT] Settings updated");
    res.json({ data: settings });
  } catch (err: any) {
    logger.error({ err }, "[admin/settings.PUT]");
    res.status(500).json({ error: err.message || "Internal server error." });
  }
});

export default router;