import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger.js";
import { itemCache } from "../lib/item-cache.js";
import { erpFetch, getErpUrl, getErpHeaders } from "../lib/erpnext-client.js";

const router: IRouter = Router();

// Fetch a Website Item by name OR item_code. Falls back to a filter search so
// banners linked by item_code (e.g. "Nutri-Cept — Women's Wellness") still resolve.
// Direct doctype lookups allow virtual/child fields (image, standard_rate),
// but those can NOT be requested in a list query. So the fallback search only
// requests real columns, then re-fetches the full doc by its `name`.
async function fetchWebsiteItem(query: string, fields: string): Promise<any> {
  // 1) Try direct lookup by document name (full fields incl. image, standard_rate)
  const directRes = await erpFetch(
    getErpUrl(`/api/resource/Website Item/${encodeURIComponent(query)}?${fields}`),
    { headers: getErpHeaders() }
  ).catch(() => null);
  if (directRes?.ok) {
    const json: any = await directRes.json().catch(() => null);
    if (json?.data) return json.data;
  }

  // 2) Fallback: locate the doc by item_code using only real columns
  const searchFields = encodeURIComponent(
    JSON.stringify(["name", "item_name", "item_code", "route"])
  );
  const filters = encodeURIComponent(JSON.stringify([["item_code", "=", query]]));
  const searchRes = await erpFetch(
    getErpUrl(`/api/resource/Website Item?filters=${filters}&fields=${searchFields}&limit_page_length=1`),
    { headers: getErpHeaders() }
  ).catch(() => null);
  if (searchRes?.ok) {
    const json: any = await searchRes.json().catch(() => null);
    if (Array.isArray(json?.data) && json.data.length > 0) {
      // 3) Fetch the full doc by its real `name` so image/standard_rate come through
      const fullRes = await erpFetch(
        getErpUrl(`/api/resource/Website Item/${encodeURIComponent(json.data[0].name)}?${fields}`),
        { headers: getErpHeaders() }
      ).catch(() => null);
      if (fullRes?.ok) {
        const full: any = await fullRes.json().catch(() => null);
        if (full?.data) return full.data;
      }
      return json.data[0];
    }
  }

  return null;
}

type BannerProduct = { productName: string; sortOrder: number };
type Banner = {
  id: string;
  title: string;
  image: string;
  isActive: boolean;
  position: number;
  products: BannerProduct[];
};

// ─── GET /api/banners ─────────────────────────────────────────────────────
// Public endpoint: returns active banners with linked product details
router.get("/banners", async (_req: Request, res: Response) => {
  try {
    const cacheKey = "banners";
    const cached = itemCache.get(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=300");
      res.json({ data: cached });
      return;
    }

    // Fetch banners from admin backend
    const adminUrl = process.env["ADMIN_API_URL"] || "http://localhost:3001/api";
    const adminRes = await fetch(`${adminUrl}/admin/banners`).catch(() => null);

    if (!adminRes || !adminRes.ok) {
      res.setHeader("X-Cache", "MISS");
      res.setHeader("Cache-Control", "public, max-age=30");
      res.json({ data: [] });
      return;
    }

    const adminData = await adminRes.json().catch(() => ({ data: [] }));
    const allBanners: Banner[] = adminData.data || [];

    // Filter active only and sort by position
    const activeBanners = allBanners
      .filter((b) => b.isActive)
      .sort((a, b) => a.position - b.position);

    if (activeBanners.length === 0) {
      itemCache.set(cacheKey, []);
      res.setHeader("X-Cache", "MISS");
      res.setHeader("Cache-Control", "public, max-age=30");
      res.json({ data: [] });
      return;
    }

    // Fetch product details for linked products
    const enrichedBanners = await Promise.all(
      activeBanners.map(async (banner) => {
        const products = await Promise.all(
          (banner.products || []).map(async (bp) => {
            try {
              const fields = JSON.stringify([
                "name", "item_name", "item_code", "image", "website_image",
                "standard_rate", "route", "short_description",
              ]);
              const params = new URLSearchParams({ fields }).toString();
              return await fetchWebsiteItem(bp.productName, params);
            } catch {
              return null;
            }
          })
        );

        return {
          ...banner,
          products: products.filter(Boolean),
        };
      })
    );

    itemCache.set(cacheKey, enrichedBanners);
    res.setHeader("X-Cache", "MISS");
    res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=300");
    res.json({ data: enrichedBanners });
  } catch (err: any) {
    logger.error({ err }, "[banners]");
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
