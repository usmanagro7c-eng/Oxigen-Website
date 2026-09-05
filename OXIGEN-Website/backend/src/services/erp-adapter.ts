import { logger } from "../lib/logger.js";
import {
  getErpUrl,
  getErpHeaders,
  parseErpError,
  erpFetch,
  findCustomerByEmail,
  getCustomerByEmail,
  updateCustomerName,
  ensureAddressLinkedToCustomer,
  createCustomerForEmail,
} from "../lib/erpnext-client.js";
import { itemCache } from "../lib/item-cache.js";

interface PricingRule {
  name: string;
  rate_or_discount: string;
  rate: number;
  discount_percentage: number;
  discount_amount: number;
  application_priority: number;
  modified: string;
}

/**
 * Shared ERPNext interaction logic for orders and items.
 */
export class ErpAdapter {
  private static slugify(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  private static async mapWithConcurrency<T, R>(
    items: T[],
    limit: number,
    mapper: (item: T) => Promise<R>,
  ): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let index = 0;

    async function worker() {
      while (index < items.length) {
        const current = index++;
        results[current] = await mapper(items[current]);
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(limit, items.length) }, () => worker()),
    );

    return results;
  }

  /**
   * Resolves a frontend item code/slug to an actual ERPNext item_code.
   * Strategies:
   *  1. Direct Website Item lookup by name
   *  2. Search Website Items by `route` field
   *  3. Try Item doctype directly
   *  4. Search Item doctype by item_code
   */
  static async resolveItemCode(rawCode: string): Promise<string> {
    // Strategy 1: Direct Website Item lookup by name
    try {
      const webRes = await erpFetch(
        getErpUrl(
          `/api/resource/Website Item/${encodeURIComponent(
            rawCode
          )}?fields=${encodeURIComponent(
            JSON.stringify(["item_code", "web_item_name", "route"])
          )}`
        ),
        { headers: getErpHeaders() }
      );
      if (webRes.ok) {
        const webData = (await webRes.json()) as {
          data?: { item_code?: string };
        };
        if (webData.data?.item_code) {
          return webData.data.item_code;
        }
      }
    } catch {
      /* Fall through */
    }

    // Strategy 2: Search Website Items by route
    try {
      const exactSearchParams = new URLSearchParams({
        fields: JSON.stringify(["item_code", "route"]),
        filters: JSON.stringify([["route", "=", rawCode]]),
        limit_page_length: "1",
      });
      const exactRes = await erpFetch(
        getErpUrl(`/api/resource/Website Item?${exactSearchParams}`),
        { headers: getErpHeaders() }
      );
      if (exactRes.ok) {
        const exactData = (await exactRes.json()) as {
          data?: { item_code: string }[];
        };
        if (exactData.data?.[0]?.item_code) return exactData.data[0].item_code;
      }

      const suffixSearchParams = new URLSearchParams({
        fields: JSON.stringify(["item_code", "route"]),
        filters: JSON.stringify([["route", "like", `%${rawCode}`]]),
        limit_page_length: "1",
      });
      const suffixRes = await erpFetch(
        getErpUrl(`/api/resource/Website Item?${suffixSearchParams}`),
        { headers: getErpHeaders() }
      );
      if (suffixRes.ok) {
        const suffixData = (await suffixRes.json()) as {
          data?: { item_code: string }[];
        };
        if (suffixData.data?.[0]?.item_code) return suffixData.data[0].item_code;
      }
    } catch {
      /* Fall through */
    }

    // Strategy 3: Try Item doctype directly
    try {
      const itemRes = await erpFetch(
        getErpUrl(
          `/api/resource/Item/${encodeURIComponent(
            rawCode
          )}?fields=${encodeURIComponent(JSON.stringify(["name", "item_code"]))}`
        ),
        { headers: getErpHeaders() }
      );
      if (itemRes.ok) return rawCode;
    } catch {
      /* Fall through */
    }

    // Strategy 4: Search Item doctype by item_code
    try {
      const searchParams = new URLSearchParams({
        fields: JSON.stringify(["name"]),
        filters: JSON.stringify([["item_code", "=", rawCode]]),
        limit_page_length: "1",
      });
      const searchRes = await erpFetch(
        getErpUrl(`/api/resource/Item?${searchParams}`),
        { headers: getErpHeaders() }
      );
      if (searchRes.ok) {
        const searchData = (await searchRes.json()) as {
          data?: { name: string }[];
        };
        if (searchData.data?.[0]?.name) return searchData.data[0].name;
      }
    } catch {
      /* Fall through */
    }

    logger.warn(
      { rawCode },
      "ErpAdapter: could not resolve item code via any strategy, using as-is"
    );
    return rawCode;
  }

  /**
   * Fetches published Website Items from ERPNext, resolving selling prices
   * (Item Price doctype, prefers Standard Selling) and warehouse stock
   * (Bin doctype) in batches. Normalizes output to a safe field set.
   */
  static async fetchWebsiteItems(options: {
    search?: string;
    limit?: string;
    itemGroup?: string;
  }): Promise<Record<string, unknown>[]> {
    const { search, limit = "60", itemGroup } = options;

    // Actual Website Item fields (schema-verified)
    const fields = JSON.stringify([
      "name",
      "item_code",
      "item_name",
      "web_item_name",
      "route",
      "published",
      "website_image",
      "website_image_alt",
      "thumbnail",
      "short_description",
      "description",
      "web_long_description",
      "item_group",
      "brand",
      "stock_uom",
      "ranking",
      "has_variants",
      "on_backorder",
      "website_warehouse",
    ]);

    // Only published Website Items
    const filters: Array<[string, string, string | number]> = [
      ["published", "=", 1],
    ];

    if (search) {
      filters.push(["item_name", "like", `%${search}%`]);
    }
    if (itemGroup) {
      filters.push(["item_group", "=", itemGroup]);
    }

    const params = new URLSearchParams({
      fields,
      filters: JSON.stringify(filters),
      limit_page_length: limit,
      order_by: "modified desc",
    });

    // "Website Item" doctype — separate endpoint from Item
    const erpRes = await erpFetch(
      getErpUrl(`/api/resource/Website Item?${params}`),
      { headers: getErpHeaders() },
    );

    if (!erpRes.ok) {
      let errBody: unknown;
      try {
        errBody = await erpRes.json();
      } catch {
        errBody = await erpRes.text().catch(() => "");
      }
      logger.error(
        { err: errBody, status: erpRes.status, url: erpRes.url },
        "[ErpAdapter] ERPNext Website Item error: API failure",
      );
      throw new Error(`Failed to fetch items from ERPNext: Status ${erpRes.status}`);
    }

    const data = (await erpRes.json()) as { data: Record<string, unknown>[] };

    // ── Batch fetch price + image fallback from the Item doctype ────────────
    const itemCodes = data.data
      .map((i) => i["item_code"] as string)
      .filter(Boolean);

    let itemDataMap: Record<string, { valuation_rate: number; image: string | null }> = {};
    const sellingPriceMap: Record<string, number> = {};

    if (itemCodes.length > 0) {
      const itemParams = new URLSearchParams({
        fields: JSON.stringify(["name", "valuation_rate", "standard_rate", "image"]),
        filters: JSON.stringify([["name", "in", itemCodes]]),
        limit_page_length: String(itemCodes.length),
      });

      const itemRes = await erpFetch(
        getErpUrl(`/api/resource/Item?${itemParams}`),
        { headers: getErpHeaders() },
      );

      if (itemRes.ok) {
        const itemJson = (await itemRes.json()) as {
          data: { name: string; valuation_rate: number; standard_rate?: number; image: string | null }[];
        };
        itemDataMap = Object.fromEntries(
          itemJson.data.map((i) => [
            i.name,
            {
              valuation_rate:
                i.standard_rate && i.standard_rate > 0
                  ? i.standard_rate
                  : i.valuation_rate ?? 0,
              image: i.image ?? null,
            },
          ]),
        );
      }

      // ── Item Price doctype se latest selling prices fetch ──────────────────
      // Fast path: batch fetch prices in chunks instead of one ERPNext request
      // per product. This removes the biggest catalog loading bottleneck.
      Object.assign(sellingPriceMap, await ErpAdapter.fetchSellingPricesForItems(itemCodes));

      // Safety fallback: if the batch query misses a few prices on a specific
      // ERPNext setup, verify only a small number individually. Items without
      // an Item Price will still use Item.standard_rate / valuation_rate below.
      const missingPriceCodes = itemCodes
        .filter((code) => !sellingPriceMap[code])
        .slice(0, 20);
      if (missingPriceCodes.length > 0) {
        const priceRows = await ErpAdapter.mapWithConcurrency(missingPriceCodes, 4, async (itemCode) => {
          const price = await ErpAdapter.fetchSellingPriceForItem(itemCode);
          return { itemCode, price };
        });

        for (const row of priceRows) {
          if (row.price && row.price > 0) {
            sellingPriceMap[row.itemCode] = row.price;
          }
        }
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    // ── Batch fetch actual warehouse stock from Bin doctype ──────────────────
    // Each Website Item may have a website_warehouse field. We fetch actual_qty
    // from Bin for those item+warehouse combos to override custom_stock_qty so
    // In/Out of Stock reflects real inventory.
    const binQtyMap: Record<string, number> = {};

    // All website stock comes from a single configured warehouse
    // (ONLINE_WAREHOUSE). We do not trust the per-item website_warehouse field
    // so online and physical inventory stay separate.
    const onlineWarehouse = process.env.ONLINE_WAREHOUSE || process.env.DEFAULT_WAREHOUSE || "Oxigen Warehouse - O";
    const warehouseItems = (data.data as Record<string, unknown>[])
      .map((i) => ({
        item_code: i["item_code"] as string,
        warehouse: onlineWarehouse,
      }))
      .filter((i): i is { item_code: string; warehouse: string } =>
        Boolean(i.item_code && i.warehouse),
      );

    if (warehouseItems.length > 0) {
      const binItemCodes = [...new Set(warehouseItems.map((i) => i.item_code))];
      const binWarehouses = [...new Set(warehouseItems.map((i) => i.warehouse))];

      const binParams = new URLSearchParams({
        fields: JSON.stringify(["item_code", "warehouse", "actual_qty", "reserved_qty"]),
        filters: JSON.stringify([
          ["item_code", "in", binItemCodes],
          ["warehouse", "in", binWarehouses],
        ]),
        limit_page_length: String(warehouseItems.length * 2),
      });

      const binRes = await erpFetch(
        getErpUrl(`/api/resource/Bin?${binParams}`),
        { headers: getErpHeaders() },
      ).catch(() => null);

      if (binRes?.ok) {
        const binJson = (await binRes.json()) as {
          data: { item_code: string; warehouse: string; actual_qty: number; reserved_qty: number }[];
        };
        for (const row of binJson.data) {
          const available = Math.max(0, (row.actual_qty ?? 0) - (row.reserved_qty ?? 0));
          binQtyMap[`${row.item_code}::${row.warehouse}`] = available;
        }
        logger.info({ rows: binJson.data.length }, "[ErpAdapter] Bin qty fetched");
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    // ── Batch fetch active Pricing Rules ────────────────────────────────
    const pricingRuleMap = await ErpAdapter.fetchActivePricingRules(itemCodes);
    // ────────────────────────────────────────────────────────────────────────

    // Normalize: website_image → image, and if website_image is missing use Item.image
    // Only return explicitly allowed fields — never forward raw ERP data
    const SAFE_FIELDS = ["name", "item_code", "item_name", "route", "published", "website_image", "website_image_alt", "thumbnail", "short_description", "description", "web_long_description", "item_group", "brand", "stock_uom", "ranking", "has_variants", "on_backorder", "custom_stock_qty"];

    const normalized = (data.data as Record<string, unknown>[]).map((item) => {
      const itemCode = item["item_code"] as string;
      const warehouse = process.env.ONLINE_WAREHOUSE || process.env.DEFAULT_WAREHOUSE || "Oxigen Warehouse - O";
      const fallback = itemDataMap[itemCode] ?? { valuation_rate: 0, image: null };
      const resolvedPrice = sellingPriceMap[itemCode] ?? fallback.valuation_rate;

      // Use actual Bin available qty (actual_qty - reserved_qty) for the configured Oxigen Warehouse
      const stockQty = warehouse
        ? (binQtyMap[`${itemCode}::${warehouse}`] ?? 0)
        : ((item["custom_stock_qty"] as number | null) ?? 0);

      // Build a safe response with only allowed fields
      const safeItem: Record<string, unknown> = {};
      for (const field of SAFE_FIELDS) {
        if (field in item) safeItem[field] = item[field];
      }

      safeItem["image"] = (item["website_image"] as string | null) || fallback.image || null;
      safeItem["item_name"] = (item["web_item_name"] as string) || (item["item_name"] as string);

      // Apply pricing rules: standard_rate = effective price, valuation_rate = original "was" price
      const pricingResult = ErpAdapter.applyBestPricingRule(resolvedPrice, pricingRuleMap.get(itemCode));
      if (pricingResult) {
        safeItem["standard_rate"] = pricingResult.effective;
        safeItem["valuation_rate"] = resolvedPrice;
        safeItem["discount_percentage"] = pricingResult.discountPct;
      } else {
        safeItem["standard_rate"] = resolvedPrice;
        safeItem["valuation_rate"] = resolvedPrice;
      }

      safeItem["custom_stock_qty"] = stockQty;

      return safeItem;
    });

    return normalized;
  }

  /**
   * Fetches parent Item Groups from ERPNext (categories).
   */
  static async fetchItemGroups(): Promise<Record<string, unknown>[]> {
    const fields = JSON.stringify(["item_group_name", "image", "description"]);
    const filters = JSON.stringify([
      ["parent_item_group", "=", "All Item Groups"],
    ]);

    const params = new URLSearchParams({
      fields,
      filters,
      limit_page_length: "100",
      order_by: "item_group_name asc",
    });

    const erpRes = await erpFetch(
      getErpUrl(`/api/resource/Item Group?${params}`),
      { headers: getErpHeaders() },
    );

    if (!erpRes.ok) {
      const err = await erpRes.json().catch(() => ({}));
      logger.error({ err }, "[ErpAdapter] ERPNext Item Group error");
      throw new Error("Failed to fetch categories from ERPNext.");
    }

    const json = (await erpRes.json()) as { data: Record<string, unknown>[] };

    // Normalize: map ERPNext fields to consistent output
    const normalized = json.data.map((group) => ({
      name: group["item_group_name"] as string,
      image: (group["image"] as string) ?? null,
      description: (group["description"] as string) ?? "",
      slug: ErpAdapter.slugify(group["item_group_name"] as string),
    }));

    return normalized;
  }

  /**
   * Fetches a single Website Item and enriches it with valuation rate, image
   * fallback, selling price, slideshow images, and warehouse stock.
   */
  static async fetchWebsiteItemDetails(name: string): Promise<Record<string, unknown>> {
    // Try the Website Item doctype first
    const webRes = await erpFetch(
      getErpUrl(`/api/resource/Website Item/${encodeURIComponent(name)}`),
      { headers: getErpHeaders() },
    );

    if (!webRes.ok) {
      throw new Error("Item not found in Website Item.");
    }

    const webData = (await webRes.json()) as { data: Record<string, unknown> };
    const item = webData.data;
    const itemCode = item["item_code"] as string | undefined;
    logger.info({ name, itemCode }, "[ErpAdapter] Website Item lookup");

    // ── Fetch valuation_rate + image fallback from the Item doctype ──────
    let valuation_rate = 0;
    let itemImage: string | null = null;

    if (itemCode) {
      // Item doctype se valuation_rate + image
      const priceRes = await erpFetch(
        getErpUrl(`/api/resource/Item/${encodeURIComponent(itemCode)}`),
        { headers: getErpHeaders() },
      ).catch(() => null);

      if (priceRes?.ok) {
        const priceData = (await priceRes.json()) as {
          data: { valuation_rate?: number; standard_rate?: number; image?: string | null };
        };
        valuation_rate =
          (priceData.data.standard_rate && priceData.data.standard_rate > 0
            ? priceData.data.standard_rate
            : priceData.data.valuation_rate) ?? 0;
        itemImage = priceData.data.image ?? null;
        logger.info(
          { standard_rate: priceData.data.standard_rate, valuation_rate: priceData.data.valuation_rate, resolved: valuation_rate },
          "[ErpAdapter] Item doctype resolved"
        );
      } else {
        logger.info({ status: priceRes?.status }, "[ErpAdapter] Item doctype fetch failed");
      }

      // ── Fetch selling price from the Item Price doctype (Standard Selling) ─
      const itemPriceParams = new URLSearchParams({
        fields: JSON.stringify(["price_list_rate", "price_list", "currency"]),
        filters: JSON.stringify([
          ["item_code", "=", itemCode],
          ["selling", "=", 1],
        ]),
        order_by: "price_list_rate desc",
        limit_page_length: "10",
      });

      const itemPriceRes = await erpFetch(
        getErpUrl(`/api/resource/Item Price?${itemPriceParams}`),
        { headers: getErpHeaders() },
      ).catch(() => null);

      if (itemPriceRes?.ok) {
        const itemPriceData = (await itemPriceRes.json()) as {
          data: { price_list_rate: number; price_list: string; currency: string }[];
        };
        logger.info({ rows: itemPriceData.data }, "[ErpAdapter] Item Price rows");
        // Prefer the "Standard Selling" price list, otherwise use the first available
        const standardPrice = itemPriceData.data.find(
          (p) => p.price_list?.toLowerCase().includes("standard selling"),
        );
        const bestPrice = standardPrice ?? itemPriceData.data[0];
        if (bestPrice?.price_list_rate > 0) {
          valuation_rate = bestPrice.price_list_rate;
          logger.info({ price_list: bestPrice.price_list, rate: valuation_rate }, "[ErpAdapter] Item Price selected");
        }
      } else {
        logger.info({ status: itemPriceRes?.status }, "[ErpAdapter] Item Price fetch failed");
      }
    }
    // ────────────────────────────────────────────────────────────────────

    // ── Fetch Website Slideshow images ──────────────────────────────
    let slideshow_images: string[] = [];
    const slideshowName = (item["slideshow"] || item["website_slideshow"]) as string | undefined;
    if (slideshowName) {
      const ssRes = await erpFetch(
        getErpUrl(`/api/resource/Website Slideshow/${encodeURIComponent(slideshowName)}`),
        { headers: getErpHeaders() },
      ).catch(() => null);

      if (ssRes?.ok) {
        const ssData = (await ssRes.json()) as {
          data?: { slideshow_items?: { image?: string }[] };
        };
        slideshow_images = (ssData.data?.slideshow_items ?? [])
          .map((s) => s.image)
          .filter((img): img is string => Boolean(img));
        logger.info({ slideshowName, imageCount: slideshow_images.length }, "[ErpAdapter] Slideshow loaded");
      }
    }

    // Fallback: If no slideshow images found from Website Slideshow, check File attachments
    if (slideshow_images.length === 0) {
      const candidateNames = [name, item["name"] as string, itemCode].filter(Boolean) as string[];
      if (candidateNames.length > 0) {
        const fileParams = new URLSearchParams({
          fields: JSON.stringify(["file_url"]),
          filters: JSON.stringify([["attached_to_name", "in", candidateNames]]),
          limit_page_length: "20",
          order_by: "creation asc",
        });
        const fileRes = await erpFetch(
          getErpUrl(`/api/resource/File?${fileParams}`),
          { headers: getErpHeaders() },
        ).catch(() => null);
        if (fileRes?.ok) {
          const fileData = (await fileRes.json()) as { data?: { file_url?: string }[] };
          slideshow_images = (fileData.data ?? [])
            .map((f) => f.file_url)
            .filter((url): url is string => Boolean(url));
        }
      }
    }
    // ────────────────────────────────────────────────────────────────────

    // ── Fetch actual warehouse stock from Bin doctype ───────────────────
    let stockQtySingle: number | null = (item["custom_stock_qty"] as number | null) ?? null;
    const websiteWarehouse = process.env.ONLINE_WAREHOUSE || process.env.DEFAULT_WAREHOUSE || "Oxigen Warehouse - O";

    if (itemCode && websiteWarehouse) {
      const binSingleParams = new URLSearchParams({
        fields: JSON.stringify(["actual_qty", "reserved_qty"]),
        filters: JSON.stringify([
          ["item_code", "=", itemCode],
          ["warehouse", "=", websiteWarehouse],
        ]),
        limit_page_length: "1",
      });

      const binSingleRes = await erpFetch(
        getErpUrl(`/api/resource/Bin?${binSingleParams}`),
        { headers: getErpHeaders() },
      ).catch(() => null);

      if (binSingleRes?.ok) {
        const binSingleJson = (await binSingleRes.json()) as {
          data: { actual_qty: number; reserved_qty: number }[];
        };
        const row = binSingleJson.data[0];
        const available = row ? Math.max(0, (row.actual_qty ?? 0) - (row.reserved_qty ?? 0)) : 0;
        stockQtySingle = available;
        logger.info({ itemCode, warehouse: websiteWarehouse, actual: row?.actual_qty, reserved: row?.reserved_qty, available }, "[ErpAdapter] Bin qty");
      }
    }
    // ────────────────────────────────────────────────────────────────────

    // ── Fetch active Pricing Rule for this item ────────────────────────
    let effectivePrice = valuation_rate;
    let discountPct = 0;
    if (itemCode) {
      const pricingMap = await ErpAdapter.fetchActivePricingRules([itemCode]);
      const pricingResult = ErpAdapter.applyBestPricingRule(valuation_rate, pricingMap.get(itemCode));
      if (pricingResult) {
        effectivePrice = pricingResult.effective;
        discountPct = pricingResult.discountPct;
      }
    }
    // ────────────────────────────────────────────────────────────────────

    // Normalize fields
    const normalized = {
      ...item,
      image: (item["website_image"] as string | null) || itemImage || null,
      item_name: item["web_item_name"] || item["item_name"],
      standard_rate: effectivePrice,
      valuation_rate,
      discount_percentage: discountPct,
      slideshow_images,
      custom_stock_qty: stockQtySingle,
    };

    return normalized;
  }

  /**
   * Proxies a file/image from ERPNext, returning the raw response so the
   * caller can relay it to the browser without exposing the internal ERP URL.
   */
  static async proxyFile(filepath: string): Promise<{
    ok: boolean;
    status: number;
    contentType: string | null;
    buffer: Buffer;
  }> {
    const erpRes = await erpFetch(
      getErpUrl(`/${filepath}`),
      { headers: getErpHeaders() },
    );

    if (!erpRes.ok) {
      return { ok: false, status: erpRes.status, contentType: null, buffer: Buffer.alloc(0) };
    }

    const contentType = erpRes.headers.get("Content-Type");
    const buffer = Buffer.from(await erpRes.arrayBuffer());
    return { ok: true, status: erpRes.status, contentType, buffer };
  }

  /**
   * Fetches the selling price for an item.
   */
  static async fetchSellingPriceForItem(    itemCode: string
  ): Promise<number | null> {
    const params = new URLSearchParams({
      fields: JSON.stringify(["price_list_rate", "price_list", "currency"]),
      filters: JSON.stringify([
        ["item_code", "=", itemCode],
        ["selling", "=", 1],
      ]),
      order_by: "price_list_rate desc",
      limit_page_length: "20",
    });

    const res = await erpFetch(getErpUrl(`/api/resource/Item Price?${params}`), {
      headers: getErpHeaders(),
    }).catch(() => null);

    if (!res?.ok) return null;

    const json = (await res.json()) as {
      data?: {
        price_list_rate?: number;
        price_list?: string;
        currency?: string;
      }[];
    };

    const rows = (json.data ?? []).filter(
      (row) =>
        typeof row.price_list_rate === "number" && row.price_list_rate > 0
    );

    if (!rows.length) return null;

    const standardSelling = rows.find((row) =>
      row.price_list?.toLowerCase().includes("standard selling")
    );

    return standardSelling?.price_list_rate ?? rows[0]?.price_list_rate ?? null;
  }

  /**
   * Batch fetches selling prices for multiple items.
   */
  static async fetchSellingPricesForItems(
    itemCodes: string[]
  ): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    const uniqueCodes = [...new Set(itemCodes.filter(Boolean))];
    const chunkSize = 80;

    for (let i = 0; i < uniqueCodes.length; i += chunkSize) {
      const chunk = uniqueCodes.slice(i, i + chunkSize);
      const params = new URLSearchParams({
        fields: JSON.stringify([
          "item_code",
          "price_list_rate",
          "price_list",
          "currency",
        ]),
        filters: JSON.stringify([
          ["item_code", "in", chunk],
          ["selling", "=", 1],
        ]),
        order_by: "price_list_rate desc",
        limit_page_length: String(Math.max(100, chunk.length * 10)),
      });

      const res = await erpFetch(
        getErpUrl(`/api/resource/Item Price?${params}`),
        { headers: getErpHeaders() }
      ).catch(() => null);

      if (!res?.ok) continue;

      const json = (await res.json()) as {
        data?: {
          item_code?: string;
          price_list_rate?: number;
          price_list?: string;
          currency?: string;
        }[];
      };

      const rowsByItem = new Map<
        string,
        { price_list_rate: number; price_list?: string }[]
      >();
      for (const row of json.data ?? []) {
        if (!row.item_code || !row.price_list_rate || row.price_list_rate <= 0)
          continue;
        const rows = rowsByItem.get(row.item_code) ?? [];
        rows.push({
          price_list_rate: row.price_list_rate,
          price_list: row.price_list,
        });
        rowsByItem.set(row.item_code, rows);
      }

      for (const [itemCode, rows] of rowsByItem) {
        const standardSelling = rows.find((row) =>
          row.price_list?.toLowerCase().includes("standard selling")
        );
        const highest = [...rows].sort(
          (a, b) => b.price_list_rate - a.price_list_rate
        )[0];
        result[itemCode] =
          standardSelling?.price_list_rate ?? highest?.price_list_rate ?? 0;
      }
    }

    return result;
  }

  /**
   * Batch fetches active selling Pricing Rules for a set of item codes.
   * ERPNext v14 uses a child table "items" for item codes, so we fetch all
   * active rules and then pull each doc's items to build an item→rules map.
   */
  static async fetchActivePricingRules(
    itemCodes: string[]
  ): Promise<Map<string, PricingRule[]>> {
    const result = new Map<string, PricingRule[]>();
    const uniqueCodes = [...new Set(itemCodes.filter(Boolean))];
    if (!uniqueCodes.length) return result;

    const today = new Date().toISOString().slice(0, 10);

    const params = new URLSearchParams({
      fields: JSON.stringify([
        "name", "title", "rate_or_discount",
        "rate", "discount_percentage", "discount_amount",
        "valid_from", "valid_upto", "priority",
        "modified",
      ]),
      filters: JSON.stringify([
        ["selling", "=", 1],
        ["disable", "=", 0],
        ["apply_on", "=", "Item Code"],
      ]),
      limit_page_length: "500",
      order_by: "modified desc",
    });

    const res = await erpFetch(
      getErpUrl(`/api/resource/Pricing Rule?${params}`),
      { headers: getErpHeaders() }
    ).catch(() => null);

    if (!res?.ok) return result;

    const json = (await res.json()) as {
      data: {
        name: string;
        title?: string;
        rate_or_discount: string;
        rate?: number;
        discount_percentage?: number;
        discount_amount?: number;
        valid_from?: string;
        valid_upto?: string;
        priority?: number;
        modified: string;
      }[];
    };

    // Pre-filter parent rules by date validity
    const candidateNames: string[] = [];
    for (const row of json.data ?? []) {
      if (row.valid_from && row.valid_from > today) continue;
      if (row.valid_upto && row.valid_upto < today) continue;
      candidateNames.push(row.name);
    }

    // Fetch each individual doc to read the "items" child table
    const detailResults = await Promise.all(
      candidateNames.map(async (name) => {
        const docRes = await erpFetch(
          getErpUrl(`/api/resource/Pricing Rule/${encodeURIComponent(name)}`),
          { headers: getErpHeaders() }
        ).catch(() => null);
        if (!docRes?.ok) return null;
        const docJson = (await docRes.json()) as {
          data: {
            items?: { item_code: string }[];
          };
        };
        return docJson.data?.items ?? [];
      })
    );

    for (let i = 0; i < candidateNames.length; i++) {
      const name = candidateNames[i];
      const match = (json.data ?? []).find((r) => r.name === name);
      if (!match) continue;

      const ruleItems = detailResults[i] ?? [];
      for (const child of ruleItems) {
        if (!child.item_code) continue;
        const existing = result.get(child.item_code) ?? [];
        existing.push({
          name,
          rate_or_discount: match.rate_or_discount,
          rate: match.rate ?? 0,
          discount_percentage: match.discount_percentage ?? 0,
          discount_amount: match.discount_amount ?? 0,
          application_priority: match.priority ?? 0,
          modified: match.modified,
        });
        result.set(child.item_code, existing);
      }
    }

    logger.info({ ruleCount: candidateNames.length, matchedItems: result.size }, "[ErpAdapter] Active pricing rules loaded");
    return result;
  }

  /**
   * Picks the best pricing rule for an item and computes the discounted price.
   * Returns { effective, discountPct } or null if no rule applies.
   */
  static applyBestPricingRule(
    basePrice: number,
    rules: PricingRule[] | undefined
  ): { effective: number; discountPct: number } | null {
    if (!rules?.length || basePrice <= 0) return null;

    // Sort: highest application_priority → farthest valid_upto (already expired not here) → most recently modified
    const sorted = [...rules].sort((a, b) => {
      if (b.application_priority !== a.application_priority) return b.application_priority - a.application_priority;
      return b.modified.localeCompare(a.modified);
    });

    const best = sorted[0];
    let effective = basePrice;

    if (best.rate_or_discount === "Rate") {
      effective = Math.max(0, best.rate);
    } else if (best.rate_or_discount === "Discount Amount") {
      effective = Math.max(0, basePrice - best.discount_amount);
    } else {
      // Discount Percentage
      effective = basePrice * (1 - best.discount_percentage / 100);
      effective = Math.max(0, Math.round(effective));
    }

    if (effective >= basePrice) return null;

    const discountPct = Math.round(((basePrice - effective) / basePrice) * 100);
    return { effective, discountPct };
  }

  /**
   * Fetches available stock for an item in a warehouse, handling group warehouses.
   */
  static async fetchAvailableStock(
    itemCode: string,
    warehouse: string,
    groupWarehouseCache: Map<string, boolean>
  ): Promise<number | null> {
    const isGroup = await this.isGroupWarehouse(
      warehouse,
      groupWarehouseCache
    );
    if (!isGroup) {
      const params = new URLSearchParams({
        fields: JSON.stringify(["actual_qty", "reserved_qty"]),
        filters: JSON.stringify([
          ["item_code", "=", itemCode],
          ["warehouse", "=", warehouse],
        ]),
        limit_page_length: "1",
      });
      const res = await erpFetch(getErpUrl(`/api/resource/Bin?${params}`), {
        headers: getErpHeaders(),
      }).catch(() => null);
      if (!res?.ok) return null;
      const json = (await res.json()) as {
        data?: { actual_qty: number; reserved_qty: number }[];
      };
      const row = json.data?.[0];
      return row ? (row.actual_qty ?? 0) - (row.reserved_qty ?? 0) : null;
    }

    // Group warehouse → aggregate across all warehouses
    const params = new URLSearchParams({
      fields: JSON.stringify(["actual_qty", "reserved_qty"]),
      filters: JSON.stringify([["item_code", "=", itemCode]]),
      limit_page_length: "100",
    });
    const res = await erpFetch(getErpUrl(`/api/resource/Bin?${params}`), {
      headers: getErpHeaders(),
    }).catch(() => null);
    if (!res?.ok) return null;
    const json = (await res.json()) as {
      data?: { actual_qty: number; reserved_qty: number }[];
    };
    return (json.data ?? []).reduce(
      (sum, r) => sum + (r.actual_qty ?? 0) - (r.reserved_qty ?? 0),
      0
    );
  }

  private static async isGroupWarehouse(
    warehouse: string,
    cache: Map<string, boolean>
  ): Promise<boolean> {
    const cached = cache.get(warehouse);
    if (cached !== undefined) return cached;
    try {
      const res = await erpFetch(
        getErpUrl(
          `/api/resource/Warehouse/${encodeURIComponent(
            warehouse
          )}?fields=${encodeURIComponent(JSON.stringify(["is_group"]))}`
        ),
        { headers: getErpHeaders() }
      );
      if (res.ok) {
        const data = (await res.json()) as {
          data?: { is_group?: number | boolean };
        };
        const isGroup = Boolean(data.data?.is_group);
        cache.set(warehouse, isGroup);
        return isGroup;
      }
    } catch {
      /* Fall through */
    }
    cache.set(warehouse, false);
    return false;
  }

  /**
   * Creates a Sales Order in ERPNext.
   */
  static async createErpOrder(payload: any): Promise<string> {
    const {
      email,
      items,
      delivery_date,
      addressName,
      shippingAddress,
      setAsDefault,
      defaultWarehouse,
      defaultCompany,
      payment_method,
    } = payload;

    let customerName = await findCustomerByEmail(email);
    const typedName = shippingAddress?.address_title?.trim();

    if (!customerName) {
      logger.warn(
        { email },
        "createErpOrder: Customer not found, attempting auto-create"
      );
      const displayName = typedName || email.split("@")[0];
      customerName = await createCustomerForEmail(email, displayName);

      if (!customerName) {
        throw new Error(
          `Customer not found for email: ${email} and auto-creation failed.`
        );
      }
    } else if (typedName) {
      // Keep the ERP customer's display name in sync with the checkout name.
      const existing = await getCustomerByEmail(email);
      if (existing?.customer_name && existing.customer_name.trim() !== typedName) {
        await updateCustomerName(customerName, typedName);
      }
    }

    const today = new Date().toISOString().split("T")[0];
    let billingAddressName: string | undefined;
    let shippingAddressName: string | undefined;

    if (addressName) {
      shippingAddressName = addressName;
      billingAddressName = addressName;
      if (setAsDefault) {
        await erpFetch(
          getErpUrl(`/api/resource/Address/${encodeURIComponent(addressName)}`),
          {
            method: "PUT",
            headers: getErpHeaders(),
            body: JSON.stringify({ is_primary_address: 1, is_shipping_address: 1 }),
          }
        ).catch(() => {});
      }
    } else if (shippingAddress) {
      try {
        const newAddressBody = {
          address_title: shippingAddress.address_title || `${customerName.replace(/\s+/g, "-")}-${Date.now()}`,
          address_type: "Shipping",
          address_line1: shippingAddress.address_line1,
          ...(shippingAddress.address_line2
            ? { address_line2: shippingAddress.address_line2 }
            : {}),
          city: shippingAddress.city,
          ...(shippingAddress.state ? { state: shippingAddress.state } : {}),
          country: shippingAddress.country,
          ...(shippingAddress.pincode ? { pincode: shippingAddress.pincode } : {}),
          ...(shippingAddress.phone ? { phone: shippingAddress.phone } : {}),
          owner: email,
          email_id: email,
          is_shipping_address: setAsDefault ? 1 : 0,
          is_primary_address: setAsDefault ? 1 : 0,
          links: [{ link_doctype: "Customer", link_name: customerName }],
        };
        const createAddrRes = await erpFetch(getErpUrl("/api/resource/Address"), {
          method: "POST",
          headers: getErpHeaders(),
          body: JSON.stringify(newAddressBody),
        });
        if (createAddrRes.ok) {
          const addrData = (await createAddrRes.json()) as any;
          shippingAddressName = addrData.data?.name;
          billingAddressName = shippingAddressName;
        }
      } catch {
        /* proceed without address */
      }
    } else {
      const params = new URLSearchParams({
        fields: JSON.stringify([
          "name",
          "address_type",
          "is_primary_address",
          "is_shipping_address",
        ]),
        filters: JSON.stringify([["email_id", "=", email]]),
        limit_page_length: "20",
        order_by: "modified desc",
      });
      const addressRes = await erpFetch(
        getErpUrl(`/api/resource/Address?${params.toString()}`),
        { headers: getErpHeaders() }
      );
      if (addressRes.ok) {
        const addressData = (await addressRes.json()) as any;
        const addresses = addressData.data ?? [];
        const billing =
          addresses.find((a: any) => a.address_type === "Billing") ??
          addresses.find((a: any) => a.is_primary_address === 1) ??
          addresses[0];
        const shipping =
          addresses.find((a: any) => a.address_type === "Shipping") ??
          addresses.find((a: any) => a.is_shipping_address === 1) ??
          billing ??
          addresses[0];
        billingAddressName = billing?.name;
        shippingAddressName = shipping?.name;
      }
    }

    if (billingAddressName) {
      const ok = await ensureAddressLinkedToCustomer(billingAddressName, customerName);
      if (!ok) {
        billingAddressName = undefined;
        shippingAddressName = undefined;
      }
    }
    if (shippingAddressName && shippingAddressName !== billingAddressName) {
      const ok = await ensureAddressLinkedToCustomer(shippingAddressName, customerName);
      if (!ok) shippingAddressName = undefined;
    }

    const targetWarehouse = defaultWarehouse || process.env.ONLINE_WAREHOUSE || process.env.DEFAULT_WAREHOUSE || "Oxigen Warehouse - O";
    const targetCompany = defaultCompany || process.env.DEFAULT_COMPANY || "Oxigen";

    const resolvedItems = await Promise.all(
      items.map(async (i: any) => {
        const actualItemCode = await this.resolveItemCode(i.item_code);
        return { item_code: actualItemCode, qty: i.qty, warehouse: targetWarehouse };
      })
    );

    const orderPayload = {
      doctype: "Sales Order",
      company: targetCompany,
      customer: customerName,
      transaction_date: today,
      delivery_date: delivery_date ?? today,
      order_type: "Shopping Cart",
      ...(billingAddressName ? { customer_address: billingAddressName } : {}),
      ...(shippingAddressName ? { shipping_address_name: shippingAddressName } : {}),
      items: resolvedItems,
      payment_method: payment_method || "Cash on Delivery",
    };

    const orderRes = await erpFetch(getErpUrl("/api/resource/Sales Order"), {
      method: "POST",
      headers: getErpHeaders(),
      body: JSON.stringify(orderPayload),
    });

    if (!orderRes.ok) {
      const err = (await orderRes.json().catch(() => ({}))) as any;
      const message =
        parseErpError(err) ||
        err.message ||
        err.exception ||
        `ERPNext responded with ${orderRes.status}`;
      throw new Error(message);
    }

    const orderData = (await orderRes.json()) as any;

    const submitRes = await erpFetch(getErpUrl("/api/method/frappe.client.submit"), {
      method: "POST",
      headers: getErpHeaders(),
      body: JSON.stringify({ doc: orderData.data }),
    });

    if (!submitRes.ok) {
      const err = (await submitRes.json().catch(() => ({}))) as any;
      const message =
        parseErpError(err) || err.message || err.exception || `Submit failed`;
      throw new Error(message);
    }

    const submitData = (await submitRes.json()) as any;
    const finalOrderName = submitData.message?.name ?? orderData.data.name;

    try {
      await this.createAndSubmitSalesInvoice(finalOrderName, targetWarehouse);
    } catch (invErr) {
      // Roll back the Sales Order so we don't leave an orphaned submitted order
      // when the Sales Invoice could not be created.
      try {
        await erpFetch(getErpUrl("/api/method/frappe.client.cancel"), {
          method: "POST",
          headers: getErpHeaders(),
          body: JSON.stringify({ doctype: "Sales Order", name: finalOrderName }),
        });
      } catch {
        /* best effort */
      }
      const message =
        invErr instanceof Error ? invErr.message : String(invErr);
      throw new Error(
        `Sales Order ${finalOrderName} was created but Sales Invoice creation failed: ${message}`
      );
    }

    itemCache.clear();
    return finalOrderName;
  }

  /**
   * Creates and submits a Sales Invoice from a submitted Sales Order.
   * Uses `update_stock = 1` so submitting the invoice posts a Stock Entry that
   * immediately deducts actual physical stock (replacing the Delivery Note flow).
   * Subtracting the Sales Order reference keeps the SO item's delivered_qty in sync
   * so the SO shows as fully delivered after the invoice is submitted.
   */
  static async createAndSubmitSalesInvoice(
    orderName: string,
    warehouse?: string
  ): Promise<string> {
    const targetWarehouse =
      warehouse ||
      process.env.ONLINE_WAREHOUSE ||
      process.env.DEFAULT_WAREHOUSE ||
      "Oxigen Warehouse - O";

    const makeRes = await erpFetch(
      getErpUrl(
        "/api/method/erpnext.selling.doctype.sales_order.sales_order.make_sales_invoice"
      ),
      {
        method: "POST",
        headers: getErpHeaders(),
        body: JSON.stringify({ source_name: orderName }),
      }
    );

    if (!makeRes.ok) {
      const err = (await makeRes.json().catch(() => ({}))) as any;
      throw new Error(
        parseErpError(err) || `Failed to prepare Sales Invoice for ${orderName}`
      );
    }

    const makeJson = (await makeRes.json()) as any;
    const siDoc = makeJson.message;
    if (!siDoc || !siDoc.doctype) {
      throw new Error(`No Sales Invoice returned for ${orderName}`);
    }

    siDoc.update_stock = 1;
    if (Array.isArray(siDoc.items)) {
      for (const item of siDoc.items) {
        if (!item.warehouse) item.warehouse = targetWarehouse;
      }
    }

    const insertRes = await erpFetch(getErpUrl("/api/resource/Sales Invoice"), {
      method: "POST",
      headers: getErpHeaders(),
      body: JSON.stringify(siDoc),
    });

    if (!insertRes.ok) {
      const err = (await insertRes.json().catch(() => ({}))) as any;
      throw new Error(
        parseErpError(err) || `Failed to create Sales Invoice for ${orderName}`
      );
    }

    const insertData = (await insertRes.json()) as any;

    const submitRes = await erpFetch(getErpUrl("/api/method/frappe.client.submit"), {
      method: "POST",
      headers: getErpHeaders(),
      body: JSON.stringify({ doc: insertData.data }),
    });

    if (!submitRes.ok) {
      const err = (await submitRes.json().catch(() => ({}))) as any;
      throw new Error(
        parseErpError(err) || `Failed to submit Sales Invoice for ${orderName}`
      );
    }

    const submitJson = (await submitRes.json()) as any;
    const siName = submitJson.message?.name ?? insertData.data.name;
    logger.info(
      { orderName, siName },
      "[ErpAdapter] Sales Invoice created & submitted (stock deducted)"
    );
    return siName;
  }

  /**
   * Automatically creates and submits a Delivery Note for a submitted Sales Order
   * to immediately deduct actual physical stock in ERPNext.
   */
  static async createAndSubmitDeliveryNote(orderName: string, warehouse?: string): Promise<string | null> {
    try {
      const targetWarehouse = warehouse || process.env.ONLINE_WAREHOUSE || process.env.DEFAULT_WAREHOUSE || "Oxigen Warehouse - O";

      const makeRes = await erpFetch(
        getErpUrl("/api/method/erpnext.selling.doctype.sales_order.sales_order.make_delivery_note"),
        {
          method: "POST",
          headers: getErpHeaders(),
          body: JSON.stringify({ source_name: orderName }),
        }
      );

      if (!makeRes.ok) {
        logger.warn({ status: makeRes.status, orderName }, "[ErpAdapter] make_delivery_note failed");
        return null;
      }

      const makeJson = (await makeRes.json()) as any;
      if (!makeJson.message) return null;

      const dnDoc = makeJson.message;
      if (Array.isArray(dnDoc.items)) {
        for (const item of dnDoc.items) {
          if (targetWarehouse) {
            item.warehouse = targetWarehouse;
          }
        }
      }

      const insertRes = await erpFetch(getErpUrl("/api/resource/Delivery Note"), {
        method: "POST",
        headers: getErpHeaders(),
        body: JSON.stringify(dnDoc),
      });

      if (!insertRes.ok) {
        const insertErr = await insertRes.json().catch(() => ({}));
        logger.warn({ insertErr, orderName }, "[ErpAdapter] Delivery Note insert failed");
        return null;
      }

      const insertData = (await insertRes.json()) as any;
      if (insertData.data) {
        const submitRes = await erpFetch(getErpUrl("/api/method/frappe.client.submit"), {
          method: "POST",
          headers: getErpHeaders(),
          body: JSON.stringify({ doc: insertData.data }),
        });

        if (submitRes.ok) {
          const submitJson = (await submitRes.json()) as any;
          const dnName = submitJson.message?.name ?? insertData.data.name;
          logger.info({ orderName, dnName }, "[ErpAdapter] Delivery Note created & submitted (stock deducted)");
          return dnName;
        } else {
          logger.warn({ orderName }, "[ErpAdapter] Delivery Note submit failed");
        }
      }
      return insertData.data?.name ?? null;
    } catch (err) {
      logger.warn({ err, orderName }, "[ErpAdapter] Error creating Delivery Note for order");
      return null;
    }
  }
}
