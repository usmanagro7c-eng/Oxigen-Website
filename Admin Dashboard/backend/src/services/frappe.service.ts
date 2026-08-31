import { erpFetch, getErpUrl, getErpHeaders, parseErpError } from "../lib/erpnext-client.js";
import { logger } from "../lib/logger.js";

/**
 * FrappeService — centralized low-level operations against Frappe ERPNext.
 *
 * All Frappe API calls go through this service. Controllers and other services
 * call FrappeService methods, never raw erpFetch.
 */
export const frappeService = {
  // ── Customer lookup ─────────────────────────────────────────────────────────

  async findCustomerByEmail(email: string): Promise<string> {
    const params = new URLSearchParams({
      fields: JSON.stringify(["name", "customer_name", "email_id"]),
      filters: JSON.stringify([["email_id", "=", email]]),
      limit_page_length: "1",
    });

    const res = await erpFetch(
      getErpUrl(`/api/resource/Customer?${params.toString()}`),
      { headers: getErpHeaders() },
    );

    if (!res.ok) return "";
    const data = (await res.json()) as { data: { name: string }[] };
    let customerName = data.data?.[0]?.name ?? "";

    // Fallback: lookup via Contact → Dynamic Link
    if (!customerName) {
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
          const linkParams = new URLSearchParams({
            fields: JSON.stringify(["link_name"]),
            filters: JSON.stringify([
              ["parent", "=", contactName],
              ["link_doctype", "=", "Customer"],
            ]),
            limit_page_length: "1",
          });
          const linkRes = await erpFetch(
            getErpUrl(`/api/resource/Dynamic Link?${linkParams.toString()}`),
            { headers: getErpHeaders() },
          );
          if (linkRes.ok) {
            const linkData = (await linkRes.json()) as { data: { link_name: string }[] };
            customerName = linkData.data?.[0]?.link_name ?? "";
          }
        }
      }
    }
    return customerName;
  },

  // ── Customer & Contact creation ─────────────────────────────────────────────

  async createCustomerForEmail(email: string, fullName: string): Promise<string> {
    const customerPayload = {
      customer_name: fullName,
      customer_type: "Individual",
      email_id: email,
      customer_group: process.env["DEFAULT_CUSTOMER_GROUP"] ?? "Individual",
      territory: process.env["DEFAULT_TERRITORY"] ?? "Pakistan",
    };

    const custRes = await erpFetch(getErpUrl("/api/resource/Customer"), {
      method: "POST",
      headers: getErpHeaders(),
      body: JSON.stringify(customerPayload),
    });

    if (!custRes.ok) return "";

    const custData = (await custRes.json()) as { data: { name: string } };
    const customerName = custData.data?.name;
    if (!customerName) return "";

    // Create Contact linked to Customer
    const nameParts = fullName.trim().split(/\s+/);
    const contactPayload = {
      first_name: nameParts[0] ?? fullName,
      last_name: nameParts.slice(1).join(" ") || undefined,
      email_id: email,
      user: email,
      links: [{ link_doctype: "Customer", link_name: customerName }],
    };

    try {
      await erpFetch(getErpUrl("/api/resource/Contact"), {
        method: "POST",
        headers: getErpHeaders(),
        body: JSON.stringify(contactPayload),
      });
    } catch (err) {
      logger.error({ err }, "[frappeService.createCustomerForEmail] failed to create contact");
    }

    return customerName;
  },

  // ── Address operations ──────────────────────────────────────────────────────

  async getAddresses(email: string) {
    const params = new URLSearchParams({
      fields: JSON.stringify([
        "name", "address_title", "address_type", "address_line1",
        "address_line2", "city", "state", "country", "pincode",
        "phone", "email_id", "is_primary_address", "is_shipping_address", "owner",
      ]),
      filters: JSON.stringify([["email_id", "=", email], ["address_type", "=", "Shipping"]]),
      limit_page_length: "100",
      order_by: "modified desc",
    });

    const res = await erpFetch(
      getErpUrl(`/api/resource/Address?${params.toString()}`),
      { headers: getErpHeaders() },
    );

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { _server_messages?: string };
      return { error: parseErpError(err) || "Failed to fetch addresses." };
    }

    const data = (await res.json()) as { data: unknown };
    return { data: data.data };
  },

  async createAddress(email: string, body: Record<string, unknown>) {
    const links: { link_doctype: string; link_name: string }[] = [];
    try {
      const contactRes = await erpFetch(
        getErpUrl(`/api/resource/Contact?${new URLSearchParams({
          fields: JSON.stringify(["name"]),
          filters: JSON.stringify([["user", "=", email]]),
          limit_page_length: "1",
        }).toString()}`),
        { headers: getErpHeaders() },
      );
      if (contactRes.ok) {
        const contactData = (await contactRes.json()) as { data: { name: string }[] };
        const contactName = contactData.data?.[0]?.name;
        if (contactName) {
          links.push({ link_doctype: "Contact", link_name: contactName });
          const linkRes = await erpFetch(
            getErpUrl(`/api/resource/Dynamic Link?${new URLSearchParams({
              fields: JSON.stringify(["link_name"]),
              filters: JSON.stringify([["parent", "=", contactName], ["link_doctype", "=", "Customer"]]),
              limit_page_length: "1",
            }).toString()}`),
            { headers: getErpHeaders() },
          );
          if (linkRes.ok) {
            const linkData = (await linkRes.json()) as { data: { link_name: string }[] };
            const customerName = linkData.data?.[0]?.link_name;
            if (customerName) links.push({ link_doctype: "Customer", link_name: customerName });
          }
        }
      }
    } catch (err) {
      logger.warn({ err }, "[frappeService.createAddress] contact link lookup failed, proceeding without links");
    }

    const safeBody = { ...body, owner: email, email_id: email, ...(links.length > 0 ? { links } : {}) };

    const res = await erpFetch(getErpUrl("/api/resource/Address"), {
      method: "POST",
      headers: getErpHeaders(),
      body: JSON.stringify(safeBody),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { _server_messages?: string };
      return { error: parseErpError(err) || "Failed to create address." };
    }
    const data = (await res.json()) as { data: unknown };
    return { data: data.data };
  },

  async updateAddress(name: string, email: string, body: Record<string, unknown>) {
    const checkRes = await erpFetch(
      getErpUrl(`/api/resource/Address/${encodeURIComponent(name)}`),
      { headers: getErpHeaders() },
    );
    if (!checkRes.ok) return { error: "Address not found.", status: 404 };
    const checkData = (await checkRes.json()) as { data?: { owner?: string; email_id?: string } };
    if (checkData.data?.owner !== email && checkData.data?.email_id !== email) {
      return { error: "Access denied.", status: 403 };
    }

    const res = await erpFetch(getErpUrl(`/api/resource/Address/${encodeURIComponent(name)}`), {
      method: "PUT",
      headers: getErpHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { _server_messages?: string };
      return { error: parseErpError(err) || "Failed to update address." };
    }
    const data = (await res.json()) as { data: unknown };
    return { data: data.data };
  },

  async deleteAddress(name: string, email: string) {
    const checkRes = await erpFetch(
      getErpUrl(`/api/resource/Address/${encodeURIComponent(name)}`),
      { headers: getErpHeaders() },
    );
    if (!checkRes.ok) return { error: "Address not found.", status: 404 };
    const checkData = (await checkRes.json()) as { data?: { owner?: string; email_id?: string } };
    if (checkData.data?.owner !== email && checkData.data?.email_id !== email) {
      return { error: "Access denied.", status: 403 };
    }

    const res = await erpFetch(getErpUrl(`/api/resource/Address/${encodeURIComponent(name)}`), {
      method: "DELETE",
      headers: getErpHeaders(),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { _server_messages?: string };
      return { error: parseErpError(err) || "Failed to delete address." };
    }
    return { message: "Address deleted." };
  },

  // ── Orders ──────────────────────────────────────────────────────────────────

  async getOrders(email: string) {
    const customerName = await this.findCustomerByEmail(email);
    if (!customerName) return { data: [] };

    const params = new URLSearchParams({
      fields: JSON.stringify(["name", "transaction_date", "status", "grand_total", "currency"]),
      filters: JSON.stringify([["customer", "=", customerName]]),
      limit_page_length: "50",
      order_by: "transaction_date desc",
    });

    const res = await erpFetch(
      getErpUrl(`/api/resource/Sales Order?${params.toString()}`),
      { headers: getErpHeaders() },
    );
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { _server_messages?: string };
      return { error: parseErpError(err) || "Failed to fetch orders." };
    }
    const data = (await res.json()) as { data: unknown };
    return { data: data.data };
  },

  async getOrderDetail(name: string, email: string) {
    const res = await erpFetch(
      getErpUrl(`/api/resource/Sales Order/${encodeURIComponent(name)}`),
      { headers: getErpHeaders() },
    );
    if (!res.ok) return { error: "Order not found.", status: 404 };

    const data = (await res.json()) as {
      data: { customer?: string } & Record<string, unknown>;
    };
    const customerName = await this.findCustomerByEmail(email);
    if (!customerName || data.data?.customer !== customerName) {
      return { error: "Access denied.", status: 403 };
    }
    return { data: data.data };
  },

  // ── Profile ─────────────────────────────────────────────────────────────────

  async getProfile(email: string) {
    const fields = ["name", "email", "full_name", "first_name", "last_name", "mobile_no", "phone", "gender", "birth_date"];
    const res = await erpFetch(
      getErpUrl(`/api/resource/User/${encodeURIComponent(email)}?fields=${encodeURIComponent(JSON.stringify(fields))}`),
      { headers: getErpHeaders() },
    );
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { _server_messages?: string };
      return { error: parseErpError(err) || "Failed to fetch profile." };
    }
    const data = (await res.json()) as { data: unknown };
    return { data: data.data };
  },

  async updateProfile(email: string, patch: Record<string, unknown>) {
    const allowedFields = ["full_name", "first_name", "last_name", "mobile_no", "phone", "gender", "birth_date"];
    const safePatch = Object.fromEntries(
      Object.entries(patch).filter(([key]) => allowedFields.includes(key)),
    );

    if (typeof safePatch.gender === "string" && safePatch.gender) {
      const g = (safePatch.gender as string).trim().toLowerCase();
      safePatch.gender = g.charAt(0).toUpperCase() + g.slice(1);
    }

    const res = await erpFetch(getErpUrl(`/api/resource/User/${encodeURIComponent(email)}`), {
      method: "PUT",
      headers: getErpHeaders(),
      body: JSON.stringify(safePatch),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { _server_messages?: string };
      return { error: parseErpError(err) || "Failed to update profile." };
    }
    const data = (await res.json()) as { data: unknown };
    return { data: data.data };
  },

  // ── Customer Profile (Customer doctype, not User) ────────────────────────────

  async getCustomerProfile(email: string) {
    const customerName = await this.findCustomerByEmail(email);
    if (!customerName) return { error: "Customer not found.", status: 404 };

    const fields = ["name", "customer_name", "customer_primary_contact", "image", "customer_group", "territory", "mobile_no", "email_id", "creation"];
    const res = await erpFetch(
      getErpUrl(`/api/resource/Customer/${encodeURIComponent(customerName)}?fields=${encodeURIComponent(JSON.stringify(fields))}`),
      { headers: getErpHeaders() },
    );
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { _server_messages?: string };
      return { error: parseErpError(err) || "Failed to fetch customer profile." };
    }
    const data = (await res.json()) as { data: Record<string, unknown> };
    return { data: data.data };
  },

  async updateCustomerProfile(email: string, patch: Record<string, unknown>) {
    const customerName = await this.findCustomerByEmail(email);
    if (!customerName) return { error: "Customer not found.", status: 404 };

    const allowedFields = ["customer_name", "mobile_no", "image"];
    const safePatch = Object.fromEntries(
      Object.entries(patch).filter(([key]) => allowedFields.includes(key)),
    );

    if (Object.keys(safePatch).length === 0) return { error: "No valid fields to update." };

    const res = await erpFetch(getErpUrl(`/api/resource/Customer/${encodeURIComponent(customerName)}`), {
      method: "PUT",
      headers: getErpHeaders(),
      body: JSON.stringify(safePatch),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { _server_messages?: string };
      return { error: parseErpError(err) || "Failed to update customer profile." };
    }
    const data = (await res.json()) as { data: unknown };
    return { data: data.data };
  },

  // async uploadProfileImage(email: string, filename: string, buffer: Buffer) {
  //   // This operation is currently unimplemented in the ERPNext integration.
  //   // If frontend profile image upload support is added, implement it here.
  //   return { error: "Profile image upload is not available." };
  // },

  // ── Change Password ──────────────────────────────────────────────────────────

  async changePassword(email: string, oldPassword: string, newPassword: string) {
    const res = await erpFetch(getErpUrl("/api/method/frappe.core.doctype.user.user.update_password"), {
      method: "POST",
      headers: { ...getErpHeaders(), Cookie: `user_id=${email}` },
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword, logout_all_sessions: 0 }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { _server_messages?: string; message?: string };
      return { error: parseErpError(err) || err.message || "Failed to change password." };
    }
    return { message: "Password updated successfully." };
  },

  async uploadProfileImage(email: string, filename: string, fileBuffer: Buffer): Promise<{ error?: string; status?: number; data?: { image: string } }> {
    const customerName = await this.findCustomerByEmail(email);
    if (!customerName) return { error: "Customer not found.", status: 404 };

    const formData = new FormData();
    const fileBlob = new Blob([new Uint8Array(fileBuffer)]);
    formData.append("file", fileBlob, filename);
    formData.append("doctype", "Customer");
    formData.append("docname", customerName);
    formData.append("is_private", "0");
    formData.append("folder", "Home/Attachments");

    const headers = getErpHeaders();
    delete headers["Content-Type"];

    const res = await erpFetch(getErpUrl("/api/method/upload_file"), {
      method: "POST",
      headers,
      body: formData as any,
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { _server_messages?: string };
      return { error: parseErpError(err) || "Failed to upload profile image." };
    }

    const json = (await res.json()) as { message?: { file_url?: string } };
    const fileUrl = json.message?.file_url;
    if (!fileUrl) {
      return { error: "Failed to upload profile image: No file URL returned." };
    }

    // Update Customer profile
    const updateRes = await this.updateCustomerProfile(email, { image: fileUrl });
    if (updateRes.error) {
      return updateRes;
    }

    // Try to sync with User document as well
    try {
      await erpFetch(getErpUrl(`/api/resource/User/${encodeURIComponent(email)}`), {
        method: "PUT",
        headers: getErpHeaders(),
        body: JSON.stringify({ user_image: fileUrl }),
      });
    } catch (err) {
      // Non-fatal fallback — log but keep the uploaded image result
      logger.warn({ err }, "[frappeService.uploadProfileImage] failed to sync user_image to User doc");
    }

    return { data: { image: fileUrl } };
  },
};
