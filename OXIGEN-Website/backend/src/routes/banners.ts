import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger.js";
import { itemCache } from "../lib/item-cache.js";
import { erpFetch, getErpUrl, getErpHeaders } from "../lib/erpnext-client.js";

const router: IRouter = Router();

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
              const params = new URLSearchParams({ fields });
              const erpRes = await erpFetch(
                getErpUrl(`/api/resource/Website Item/${encodeURIComponent(bp.productName)}?${params}`),
                { headers: getErpHeaders() }
              );
              if (!erpRes.ok) return null;
              const json: any = await erpRes.json().catch(() => null);
              return json?.data || null;
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
