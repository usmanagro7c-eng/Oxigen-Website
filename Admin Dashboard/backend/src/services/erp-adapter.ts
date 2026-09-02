import { logger } from "../lib/logger.js";
import { itemCache } from "../lib/item-cache.js";
import {
  getErpUrl,
  getErpHeaders,
  parseErpError,
  erpFetch,
  findCustomerByEmail,
  ensureAddressLinkedToCustomer,
  createCustomerForEmail,
} from "../lib/erpnext-client.js";

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
  }): Promise<Record<string, unknown>[]> {
    const { search, limit = "60" } = options;

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
    const filters: Array<[string, string, string | number]> = [];

    if (search) {
      filters.push(["item_name", "like", `%${search}%`]);
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
      safeItem["standard_rate"] = resolvedPrice;
      safeItem["valuation_rate"] = resolvedPrice;
      safeItem["custom_stock_qty"] = stockQty;

      return safeItem;
    });

    return normalized;
  }

  static async getOrCreateSupplier(defaultCompany: string): Promise<string> {
    try {
      const res = await erpFetch(getErpUrl("/api/resource/Supplier?limit_page_length=1"), {
        headers: getErpHeaders(),
      });
      if (res.ok) {
        const json: any = await res.json();
        if (json.data?.[0]?.name) return json.data[0].name;
      }
      const createRes = await erpFetch(getErpUrl("/api/resource/Supplier"), {
        method: "POST",
        headers: getErpHeaders(),
        body: JSON.stringify({
          doctype: "Supplier",
          supplier_name: "External",
          supplier_group: "All Supplier Groups",
          supplier_type: "Company",
        }),
      });
      if (createRes.ok) {
        const createJson: any = await createRes.json();
        if (createJson.data?.name) return createJson.data.name;
      }
    } catch {
      // fallback
    }
    return "External";
  }

  /**
   * Creates a new Item and an associated Website Item in ERPNext.
   */
  static async createItem(payload: {
    item_name: string;
    item_group: string;
    stock_uom: string;
    description?: string;
    standard_rate?: number;
    stock_qty?: number;
    image?: string;
    imageUrl?: string;
    sku?: string;
    item_code?: string;
    publish?: boolean;
    website_warehouse?: string;
    short_description?: string;
  }): Promise<{ name: string; item_code: string } | null> {
    const defaultCompany = process.env.DEFAULT_COMPANY ?? "Oxigen";
    const mainWarehouse = (process.env.MAIN_WAREHOUSE || process.env.DEFAULT_WAREHOUSE || process.env.ONLINE_WAREHOUSE || "Oxigen Warehouse - O").trim();
    const onlineWarehouse = (process.env.ONLINE_WAREHOUSE || mainWarehouse).trim();
    const defaultWarehouse = mainWarehouse;

    const itemCode = (payload.sku || payload.item_code || ErpAdapter.slugify(payload.item_name))
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "-")
      .replace(/^-+|-+$/g, "");

    // 1. Create the Item
    const itemPayload = {
      doctype: "Item",
      item_name: payload.item_name,
      item_code: itemCode,
      item_group: payload.item_group,
      stock_uom: payload.stock_uom || "Nos",
      description: payload.description,
      standard_rate: payload.standard_rate,
      is_stock_item: 1,
      default_warehouse: defaultWarehouse,
      item_defaults: [
        {
          company: defaultCompany,
          default_warehouse: defaultWarehouse,
        },
      ],
      // Add image if provided
      ...(payload.image ? { image: payload.image } : {}),
    };

    const itemRes = await erpFetch(getErpUrl("/api/resource/Item"), {
      method: "POST",
      headers: getErpHeaders(),
      body: JSON.stringify(itemPayload),
    });

    if (!itemRes.ok) {
      const err = (await itemRes.json().catch(() => ({}))) as { _server_messages?: string };
      logger.error({ err }, "[ErpAdapter] Failed to create Item in ERPNext");
      throw new Error(parseErpError(err) || "Failed to create item in ERPNext.");
    }

    const itemData = (await itemRes.json()) as { data: { name: string; item_code: string } };
    const newItemCode = itemData.data.item_code;

    // 2. Create the Website Item if publish is true
    if (payload.publish) {
      const websiteItemPayload = {
        doctype: "Website Item",
        item_code: newItemCode,
        web_item_name: payload.item_name,
        published: 1,
        website_warehouse: onlineWarehouse,
        short_description: payload.short_description,
        description: payload.description,
      };

      const websiteItemRes = await erpFetch(getErpUrl("/api/resource/Website Item"), {
        method: "POST",
        headers: getErpHeaders(),
        body: JSON.stringify(websiteItemPayload),
      });

      if (!websiteItemRes.ok) {
        const err = (await websiteItemRes.json().catch(() => ({}))) as { _server_messages?: string };
        logger.warn({ err, newItemCode }, "[ErpAdapter] Failed to create Website Item for new Item.");
      }
    }

    // 3. Create Item Price for standard selling
    if (typeof payload.standard_rate === "number" && payload.standard_rate > 0) {
      try {
        await erpFetch(getErpUrl("/api/resource/Item Price"), {
          method: "POST",
          headers: getErpHeaders(),
          body: JSON.stringify({
            doctype: "Item Price",
            item_code: newItemCode,
            price_list: "Standard Selling",
            price_list_rate: payload.standard_rate,
            selling: 1,
          }),
        });
      } catch {
        // non-fatal
      }
    }

    // 4. Create & Submit Purchase Invoice with update_stock: 1 in Main Warehouse
    try {
      const today = new Date().toISOString().split('T')[0];
      const supplier = await ErpAdapter.getOrCreateSupplier(defaultCompany);
      const invoiceQty = (typeof payload.stock_qty === 'number' && payload.stock_qty > 0)
        ? payload.stock_qty
        : (Number(payload.stock_qty) > 0 ? Number(payload.stock_qty) : 1);
      const rate = typeof payload.standard_rate === 'number' && payload.standard_rate > 0
        ? payload.standard_rate
        : 0;

      const piPayload: any = {
        doctype: "Purchase Invoice",
        company: defaultCompany,
        supplier,
        posting_date: today,
        due_date: today,
        update_stock: 1,
        set_warehouse: mainWarehouse,
        items: [
          {
            item_code: newItemCode,
            qty: invoiceQty,
            rate,
            warehouse: mainWarehouse,
            expense_account: "Stock In Hand - O",
            cost_center: "Main - O",
          },
        ],
      };

      let piRes = await erpFetch(getErpUrl("/api/resource/Purchase Invoice"), {
        method: "POST",
        headers: getErpHeaders(),
        body: JSON.stringify(piPayload),
      });

      // If initial creation fails, retry without hardcoded expense account/cost center
      if (!piRes.ok) {
        delete piPayload.items[0].expense_account;
        delete piPayload.items[0].cost_center;
        piRes = await erpFetch(getErpUrl("/api/resource/Purchase Invoice"), {
          method: "POST",
          headers: getErpHeaders(),
          body: JSON.stringify(piPayload),
        });
      }

      if (piRes.ok) {
        const piData: any = await piRes.json();
        if (piData.data?.name) {
          await erpFetch(getErpUrl("/api/method/frappe.client.submit"), {
            method: "POST",
            headers: getErpHeaders(),
            body: JSON.stringify({ doc: piData.data }),
          }).catch((subErr) => {
            logger.warn({ subErr, piName: piData.data.name }, "[ErpAdapter] Purchase Invoice submit error");
          });
          logger.info({ newItemCode, piName: piData.data.name, qty: invoiceQty, warehouse: mainWarehouse }, "[ErpAdapter] Purchase Invoice submitted with update_stock: 1 in Main Warehouse");
        }
      } else {
        const err = await piRes.json().catch(() => ({}));
        logger.warn({ err, newItemCode }, "[ErpAdapter] Failed to create Purchase Invoice for new Item");
      }
    } catch (stockErr) {
      logger.warn({ stockErr, newItemCode }, "[ErpAdapter] Error creating Purchase Invoice for initial stock");
    }

    itemCache.clear();
    return itemData.data;
  }

  /**
   * Fetches Item Groups from ERPNext (categories).
   */
  static async fetchItemGroups(): Promise<Record<string, unknown>[]> {
    const fields = JSON.stringify([
      "name",
      "item_group_name",
      "parent_item_group",
      "is_group",
      "image",
      "description",
    ]);

    const params = new URLSearchParams({
      fields,
      limit_page_length: "200",
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
    const normalized = json.data.map((group) => {
      const groupName = (group["item_group_name"] || group["name"] || "") as string;
      return {
        name: group["name"] as string || groupName,
        item_group_name: groupName,
        parent_item_group: (group["parent_item_group"] as string) || "All Item Groups",
        is_group: Number(group["is_group"]) || 0,
        image: (group["image"] as string) ?? null,
        description: (group["description"] as string) ?? "",
        slug: ErpAdapter.slugify(groupName),
      };
    });

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
    const slideshowName = item["website_slideshow"] as string | undefined;
    if (slideshowName) {
      const slideshowParams = new URLSearchParams({
        fields: JSON.stringify(["image"]),
        filters: JSON.stringify([["parent", "=", slideshowName]]),
        limit_page_length: "20",
        order_by: "idx asc",
      });
      const slideshowRes = await erpFetch(
        getErpUrl(`/api/resource/Website Slideshow Item?${slideshowParams}`),
        { headers: getErpHeaders() },
      ).catch(() => null);

      if (slideshowRes?.ok) {
        const slideshowData = (await slideshowRes.json()) as {
          data: { image: string }[];
        };
        slideshow_images = slideshowData.data
          .map((s) => s.image)
          .filter(Boolean);
        logger.info({ slideshowName, imageCount: slideshow_images.length }, "[ErpAdapter] Slideshow loaded");
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

    // Normalize fields
    const normalized = {
      ...item,
      image: (item["website_image"] as string | null) || itemImage || null,
      item_name: item["web_item_name"] || item["item_name"],
      standard_rate: valuation_rate,
      valuation_rate,
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
    } = payload;

    let customerName = await findCustomerByEmail(email);

    if (!customerName) {
      logger.warn(
        { email },
        "createErpOrder: Customer not found, attempting auto-create"
      );
      const displayName = email.split("@")[0];
      customerName = await createCustomerForEmail(email, displayName);

      if (!customerName) {
        throw new Error(
          `Customer not found for email: ${email} and auto-creation failed.`
        );
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
          address_title: `${customerName.replace(/\s+/g, "-")}-${Date.now()}`,
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
      throw new Error(`Order created but submit failed: ${message}`);
    }

    const submitData = (await submitRes.json()) as any;
    const finalOrderName = submitData.message?.name ?? orderData.data.name;

    // Automatically create & submit Delivery Note to physically deduct actual stock in ERPNext
    await this.createAndSubmitDeliveryNote(finalOrderName, targetWarehouse);

    itemCache.clear();
    return finalOrderName;
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
