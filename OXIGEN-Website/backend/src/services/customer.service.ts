import { erpFetch, getErpUrl, getErpHeaders, parseErpError, findCustomerByEmail } from "../lib/erpnext-client.js";
import { logger } from "../lib/logger.js";

/**
 * CustomerService — Frappe operations for customer-specific data:
 * profile, addresses, orders, wishlist.
 */
export const customerService = {
  // ── Profile ────────────────────────────────────────────────────────────────

  async getProfile(email: string) {
    const USER_FIELDS = ["name","email","full_name","first_name","last_name","mobile_no","phone","gender","birth_date"];

    try {
      const erpRes = await erpFetch(
        getErpUrl(`/api/resource/User/${encodeURIComponent(email)}?fields=${encodeURIComponent(JSON.stringify(USER_FIELDS))}`),
        { headers: getErpHeaders() },
      );

      if (!erpRes.ok) {
        const err = (await erpRes.json().catch(() => ({}))) as { _server_messages?: string };
        return { error: parseErpError(err) || "Failed to fetch profile." };
      }

      const data = (await erpRes.json()) as { data: unknown };
      return { data: data.data };
    } catch (err) {
      logger.error({ err }, "[customerService.getProfile]");
      return { error: "Internal server error." };
    }
  },

  async updateProfile(email: string, patch: Record<string, unknown>) {
    const allowedFields = ["full_name","first_name","last_name","mobile_no","phone","gender","birth_date"];
    const safePatch = Object.fromEntries(
      Object.entries(patch).filter(([key]) => allowedFields.includes(key)),
    );

    if (typeof safePatch.gender === "string" && safePatch.gender) {
      const g = (safePatch.gender as string).trim().toLowerCase();
      safePatch.gender = g.charAt(0).toUpperCase() + g.slice(1);
    }

    try {
      const erpRes = await erpFetch(getErpUrl(`/api/resource/User/${encodeURIComponent(email)}`), {
        method: "PUT",
        headers: getErpHeaders(),
        body: JSON.stringify(safePatch),
      });

      if (!erpRes.ok) {
        const err = (await erpRes.json().catch(() => ({}))) as { _server_messages?: string };
        return { error: parseErpError(err) || "Failed to update profile." };
      }

      const data = (await erpRes.json()) as { data: unknown };
      return { data: data.data };
    } catch (err) {
      logger.error({ err }, "[customerService.updateProfile]");
      return { error: "Internal server error." };
    }
  },

  // ── Addresses ──────────────────────────────────────────────────────────────

  ADDRESS_FIELDS: [
    "name","address_title","address_type","address_line1","address_line2",
    "city","state","country","pincode","phone","email_id",
    "is_primary_address","is_shipping_address","owner",
  ] as const,

  async getAddresses(email: string) {
    const params = new URLSearchParams({
      fields: JSON.stringify(this.ADDRESS_FIELDS),
      filters: JSON.stringify([["email_id", "=", email], ["address_type", "=", "Shipping"]]),
      limit_page_length: "100",
      order_by: "modified desc",
    });

    try {
      const erpRes = await erpFetch(
        getErpUrl(`/api/resource/Address?${params.toString()}`),
        { headers: getErpHeaders() },
      );

      if (!erpRes.ok) {
        const err = (await erpRes.json().catch(() => ({}))) as { _server_messages?: string };
        return { error: parseErpError(err) || "Failed to fetch addresses." };
      }

      const data = (await erpRes.json()) as { data: unknown };
      return { data: data.data };
    } catch (err) {
      logger.error({ err }, "[customerService.getAddresses]");
      return { error: "Internal server error." };
    }
  },

  async createAddress(email: string, addressData: Record<string, unknown>) {
    // Find the customer and contact to link the address
    const links: { link_doctype: string; link_name: string }[] = [];

    try {
      const contactParams = new URLSearchParams({
        fields: JSON.stringify(["name"]),
        filters: JSON.stringify([["user", "=", email]]),
        limit_page_length: "1",
      });

      const contactRes = await erpFetch(
        getErpUrl(`/api/resource/Contact?${contactParams.toString()}`),
        { headers: getErpHeaders() },
      );

      if (contactRes.ok) {
        const contactData = (await contactRes.json()) as { data: { name: string }[] };
        const contactName = contactData.data?.[0]?.name;
        if (contactName) {
          links.push({ link_doctype: "Contact", link_name: contactName });

          const linkParams = new URLSearchParams({
            fields: JSON.stringify(["link_name"]),
            filters: JSON.stringify([["parent", "=", contactName], ["link_doctype", "=", "Customer"]]),
            limit_page_length: "1",
          });

          const linkRes = await erpFetch(
            getErpUrl(`/api/resource/Dynamic Link?${linkParams.toString()}`),
            { headers: getErpHeaders() },
          );

          if (linkRes.ok) {
            const linkData = (await linkRes.json()) as { data: { link_name: string }[] };
            const customerName = linkData.data?.[0]?.link_name;
            if (customerName) links.push({ link_doctype: "Customer", link_name: customerName });
          }
        }
      }
    } catch {
      // proceed without links
    }

    const safeBody = {
      ...addressData,
      owner: email,
      email_id: email,
      ...(links.length > 0 ? { links } : {}),
    };

    try {
      const erpRes = await erpFetch(getErpUrl("/api/resource/Address"), {
        method: "POST",
        headers: getErpHeaders(),
        body: JSON.stringify(safeBody),
      });

      if (!erpRes.ok) {
        const err = (await erpRes.json().catch(() => ({}))) as { _server_messages?: string };
        return { error: parseErpError(err) || "Failed to create address." };
      }

      const data = (await erpRes.json()) as { data: unknown };
      return { data: data.data };
    } catch (err) {
      logger.error({ err }, "[customerService.createAddress]");
      return { error: "Internal server error." };
    }
  },

  async updateAddress(name: string, email: string, addressData: Record<string, unknown>) {
    try {
      // Ownership check
      const checkRes = await erpFetch(
        getErpUrl(`/api/resource/Address/${encodeURIComponent(name)}`),
        { headers: getErpHeaders() },
      );

      if (!checkRes.ok) return { error: "Address not found.", status: 404 };

      const checkData = (await checkRes.json()) as { data?: { owner?: string; email_id?: string } };
      const isOwner = checkData.data?.owner === email || checkData.data?.email_id === email;
      if (!isOwner) return { error: "Access denied.", status: 403 };

      const erpRes = await erpFetch(getErpUrl(`/api/resource/Address/${encodeURIComponent(name)}`), {
        method: "PUT",
        headers: getErpHeaders(),
        body: JSON.stringify(addressData),
      });

      if (!erpRes.ok) {
        const err = (await erpRes.json().catch(() => ({}))) as { _server_messages?: string };
        return { error: parseErpError(err) || "Failed to update address." };
      }

      const data = (await erpRes.json()) as { data: unknown };
      return { data: data.data };
    } catch (err) {
      logger.error({ err }, "[customerService.updateAddress]");
      return { error: "Internal server error." };
    }
  },

  async deleteAddress(name: string, email: string) {
    try {
      const checkRes = await erpFetch(
        getErpUrl(`/api/resource/Address/${encodeURIComponent(name)}`),
        { headers: getErpHeaders() },
      );

      if (!checkRes.ok) return { error: "Address not found.", status: 404 };

      const checkData = (await checkRes.json()) as { data?: { owner?: string; email_id?: string } };
      const isOwner = checkData.data?.owner === email || checkData.data?.email_id === email;
      if (!isOwner) return { error: "Access denied.", status: 403 };

      const erpRes = await erpFetch(getErpUrl(`/api/resource/Address/${encodeURIComponent(name)}`), {
        method: "DELETE",
        headers: getErpHeaders(),
      });

      if (!erpRes.ok) {
        const err = (await erpRes.json().catch(() => ({}))) as { _server_messages?: string };
        return { error: parseErpError(err) || "Failed to delete address." };
      }

      return { message: "Address deleted." };
    } catch (err) {
      logger.error({ err }, "[customerService.deleteAddress]");
      return { error: "Internal server error." };
    }
  },

  // ── Orders ─────────────────────────────────────────────────────────────────

  ORDER_LIST_FIELDS: ["name","transaction_date","status","grand_total","currency"] as const,

  async getOrders(email: string) {
    const customerName = await findCustomerByEmail(email);
    if (!customerName) return { data: [] };

    const params = new URLSearchParams({
      fields: JSON.stringify(this.ORDER_LIST_FIELDS),
      filters: JSON.stringify([["customer", "=", customerName]]),
      limit_page_length: "50",
      order_by: "transaction_date desc",
    });

    try {
      const erpRes = await erpFetch(
        getErpUrl(`/api/resource/Sales Order?${params.toString()}`),
        { headers: getErpHeaders() },
      );

      if (!erpRes.ok) {
        const err = (await erpRes.json().catch(() => ({}))) as { _server_messages?: string };
        return { error: parseErpError(err) || "Failed to fetch orders." };
      }

      const data = (await erpRes.json()) as { data: unknown };
      return { data: data.data };
    } catch (err) {
      logger.error({ err }, "[customerService.getOrders]");
      return { error: "Internal server error." };
    }
  },

  async getOrderDetail(name: string, email: string) {
    try {
      const erpRes = await erpFetch(
        getErpUrl(`/api/resource/Sales Order/${encodeURIComponent(name)}`),
        { headers: getErpHeaders() },
      );

      if (!erpRes.ok) return { error: "Order not found.", status: 404 };

      const data = (await erpRes.json()) as {
        data: { owner?: string; customer?: string } & Record<string, unknown>;
      };

      const customerName = await findCustomerByEmail(email);
      if (!customerName || data.data?.customer !== customerName) {
        return { error: "Access denied.", status: 403 };
      }

      return { data: data.data };
    } catch (err) {
      logger.error({ err }, "[customerService.getOrderDetail]");
      return { error: "Internal server error." };
    }
  },

  // ── Wishlist ───────────────────────────────────────────────────────────────

  async getWishlist(email: string) {
    // Wishlist in Frappe is typically stored as Item records linked via
    // "Wishlist Item" doctype or custom field. For now, return empty array.
    return { data: [] };
  },

  // ── Cart ───────────────────────────────────────────────────────────────────

  async getCart(email: string) {
    // Cart data in Frappe is typically stored as a "Shopping Cart" quotation.
    // For now, return empty array.
    return { data: [] };
  },
};
