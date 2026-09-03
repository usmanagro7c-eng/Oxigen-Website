import { Router, type IRouter, type Request, type Response } from "express";
import { erpFetch, getErpUrl, getErpHeaders, parseErpError } from "../lib/erpnext-client.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

export interface BannerItem {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  link: string;
  cta?: string;
  active: boolean;
  order: number;
}

const DEFAULT_BANNERS: BannerItem[] = [
  {
    id: "nutri-cept",
    title: "Nutri-Cept® Women's Wellness",
    subtitle: "Complete Hormonal Balance, PCOS Support & Ovulation Health",
    image: "/banners/banner-nutricept.jpg",
    link: "/product/nutri-cept",
    cta: "Shop Nutri-Cept",
    active: true,
    order: 1,
  },
  {
    id: "oxidop",
    title: "OxiDop — Calm & Focused Energy",
    subtitle: "Clinically-crafted dopamine and neurotransmitter support formula",
    image: "/banners/banner-oxidop.jpg",
    link: "/product/oxidop",
    cta: "Shop OxiDop",
    active: true,
    order: 2,
  },
];

async function ensureSlideshowExists(): Promise<void> {
  const checkRes = await erpFetch(getErpUrl("/api/resource/Website Slideshow/ws-home-banners"), {
    headers: getErpHeaders(),
  }).catch(() => null);

  if (!checkRes || !checkRes.ok) {
    await erpFetch(getErpUrl("/api/resource/Website Slideshow"), {
      method: "POST",
      headers: getErpHeaders(),
      body: JSON.stringify({
        doctype: "Website Slideshow",
        name: "ws-home-banners",
        slideshow_name: "ws-home-banners",
        slideshow_items: DEFAULT_BANNERS.map((b, i) => ({
          image: b.image,
          heading: b.title,
          description: b.subtitle || "",
          url: b.link,
          idx: i + 1,
        })),
      }),
    }).catch(() => {});
  }
}

async function fetchHomeBannersFromErp(): Promise<BannerItem[]> {
  await ensureSlideshowExists();
  const res = await erpFetch(getErpUrl("/api/resource/Website Slideshow/ws-home-banners"), {
    headers: getErpHeaders(),
  }).catch(() => null);

  if (!res || !res.ok) {
    return DEFAULT_BANNERS;
  }

  const json: any = await res.json().catch(() => ({}));
  const items: any[] = json.data?.slideshow_items || [];

  if (items.length === 0) {
    return DEFAULT_BANNERS;
  }

  return items.map((it, idx) => ({
    id: it.name || ("banner-" + (idx + 1)),
    title: it.heading || it.image_description || "Special Offer",
    subtitle: it.description || "",
    image: it.image || "",
    link: it.url || "/shop",
    cta: "Shop Now",
    active: true,
    order: it.idx || idx + 1,
  }));
}

async function saveHomeBannersToErp(banners: BannerItem[]): Promise<void> {
  await ensureSlideshowExists();
  const childRows = banners.map((b, i) => ({
    image: b.image,
    heading: b.title,
    description: b.subtitle || "",
    url: b.link,
    idx: i + 1,
  }));

  const res = await erpFetch(getErpUrl("/api/resource/Website Slideshow/ws-home-banners"), {
    method: "PUT",
    headers: getErpHeaders(),
    body: JSON.stringify({
      slideshow_name: "ws-home-banners",
      slideshow_items: childRows,
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as any;
    throw new Error(parseErpError(err) || "Failed to update banners in ERPNext.");
  }
}

// ─── GET /api/banners (Public) ─────────────────────────────────────────────
router.get("/banners", async (_req: Request, res: Response) => {
  try {
    const banners = await fetchHomeBannersFromErp();
    res.json({ data: banners });
  } catch (err: any) {
    logger.error({ err }, "[banners.GET]");
    res.json({ data: DEFAULT_BANNERS });
  }
});

// ─── GET /api/admin/banners (Admin) ─────────────────────────────────────────
router.get("/admin/banners", async (_req: Request, res: Response) => {
  try {
    const banners = await fetchHomeBannersFromErp();
    res.json({ data: banners });
  } catch (err: any) {
    logger.error({ err }, "[admin/banners.GET]");
    res.status(500).json({ error: err.message || "Failed to fetch banners." });
  }
});

// ─── POST /api/admin/banners (Create New Banner) ────────────────────────────
router.post("/admin/banners", async (req: Request, res: Response) => {
  try {
    const { title, subtitle, image, link, cta } = req.body;
    if (!image) {
      res.status(400).json({ error: "Banner image is required." });
      return;
    }

    const current = await fetchHomeBannersFromErp();
    const newBanner: BannerItem = {
      id: "b-" + Date.now(),
      title: title || "Featured Promotion",
      subtitle: subtitle || "",
      image,
      link: link || "/shop",
      cta: cta || "Shop Now",
      active: true,
      order: current.length + 1,
    };

    const updated = [...current, newBanner];
    await saveHomeBannersToErp(updated);

    // Invalidate website cache
    try {
      const websiteUrl = process.env.WEBSITE_BACKEND_URL || "http://localhost:3002";
      await fetch(`${websiteUrl}/api/items/cache/clear`, { method: "POST" }).catch(() => {});
    } catch {
      /* non-fatal */
    }

    res.status(201).json({ data: newBanner });
  } catch (err: any) {
    logger.error({ err }, "[admin/banners.POST]");
    res.status(500).json({ error: err.message || "Failed to add banner." });
  }
});

// ─── PUT /api/admin/banners (Batch Update / Reorder) ─────────────────────────
router.put("/admin/banners", async (req: Request, res: Response) => {
  try {
    const { banners } = req.body;
    if (!Array.isArray(banners)) {
      res.status(400).json({ error: "Banners array is required." });
      return;
    }

    await saveHomeBannersToErp(banners);

    // Invalidate website cache
    try {
      const websiteUrl = process.env.WEBSITE_BACKEND_URL || "http://localhost:3002";
      await fetch(`${websiteUrl}/api/items/cache/clear`, { method: "POST" }).catch(() => {});
    } catch {
      /* non-fatal */
    }

    res.json({ data: banners });
  } catch (err: any) {
    logger.error({ err }, "[admin/banners.PUT]");
    res.status(500).json({ error: err.message || "Failed to update banners." });
  }
});

// ─── PUT /api/admin/banners/:id (Update Specific Banner) ────────────────────
router.put("/admin/banners/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, subtitle, image, link, cta, active } = req.body;

    const current = await fetchHomeBannersFromErp();
    const targetIdx = current.findIndex((b) => b.id === id);

    if (targetIdx === -1) {
      res.status(404).json({ error: "Banner not found." });
      return;
    }

    current[targetIdx] = {
      ...current[targetIdx],
      ...(title !== undefined ? { title } : {}),
      ...(subtitle !== undefined ? { subtitle } : {}),
      ...(image !== undefined ? { image } : {}),
      ...(link !== undefined ? { link } : {}),
      ...(cta !== undefined ? { cta } : {}),
      ...(active !== undefined ? { active } : {}),
    };

    await saveHomeBannersToErp(current);

    // Invalidate website cache
    try {
      const websiteUrl = process.env.WEBSITE_BACKEND_URL || "http://localhost:3002";
      await fetch(`${websiteUrl}/api/items/cache/clear`, { method: "POST" }).catch(() => {});
    } catch {
      /* non-fatal */
    }

    res.json({ data: current[targetIdx] });
  } catch (err: any) {
    logger.error({ err }, "[admin/banners/:id.PUT]");
    res.status(500).json({ error: err.message || "Failed to update banner." });
  }
});

// ─── DELETE /api/admin/banners/:id (Delete Banner) ──────────────────────────
router.delete("/admin/banners/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const current = await fetchHomeBannersFromErp();
    const filtered = current.filter((b) => b.id !== id);

    await saveHomeBannersToErp(filtered);

    // Invalidate website cache
    try {
      const websiteUrl = process.env.WEBSITE_BACKEND_URL || "http://localhost:3002";
      await fetch(`${websiteUrl}/api/items/cache/clear`, { method: "POST" }).catch(() => {});
    } catch {
      /* non-fatal */
    }

    res.json({ success: true, message: "Banner deleted successfully." });
  } catch (err: any) {
    logger.error({ err }, "[admin/banners/:id.DELETE]");
    res.status(500).json({ error: err.message || "Failed to delete banner." });
  }
});

export default router;