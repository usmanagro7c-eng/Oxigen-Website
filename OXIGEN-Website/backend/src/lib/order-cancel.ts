import { erpFetch, getErpUrl, getErpHeaders } from "./erpnext-client.js";
import { logger } from "./logger.js";

/**
 * Cancels a Sales Order and its linked Sales Invoice, restoring stock.
 *
 * ERPNext will not cancel a Sales Order while a Sales Invoice still points at
 * it ("Sales Invoice … must be deleted before cancelling this Sales Order"),
 * and it will not cancel the order while a Payment Entry is linked either. So
 * the invoice has to go through three steps: cancel (reverses the stock
 * movement), delete (removes the link), and only then can the order be
 * cancelled.
 *
 * Every step is checked, and the caller is told what could not be completed
 * instead of a blanket "cancelled" that leaves reserved stock stuck.
 */
export interface CancelOrderResult {
  ok: boolean;
  invoiceCancelled: boolean;
  invoiceDeleted: boolean;
  orderCancelled: boolean;
  error?: string;
}

async function erpCall(path: string, method: string, body?: unknown) {
  return erpFetch(getErpUrl(path), {
    method,
    headers: getErpHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

export async function cancelSalesOrder(orderName: string): Promise<CancelOrderResult> {
  const result: CancelOrderResult = {
    ok: false,
    invoiceCancelled: false,
    invoiceDeleted: false,
    orderCancelled: false,
  };

  // ── 1) Find the linked Sales Invoice ────────────────────────────────────
  let invoiceName: string | null = null;
  try {
    const invRes = await erpCall(
      `/api/resource/Sales Invoice?${new URLSearchParams({
        fields: JSON.stringify(["name", "docstatus"]),
        filters: JSON.stringify([["items.sales_order", "=", orderName]]),
        limit_page_length: "1",
      }).toString()}`,
      "GET",
    );
    if (invRes.ok) {
      const json = (await invRes.json()) as { data?: { name: string }[] };
      invoiceName = json.data?.[0]?.name ?? null;
    }
  } catch (err) {
    logger.warn({ err, orderName }, "[cancelSalesOrder] invoice lookup failed");
  }

  // ── 2) Cancel + delete the invoice ─────────────────────────────────────
  if (invoiceName) {
    const cancelRes = await erpCall(
      "/api/method/frappe.client.cancel",
      "POST",
      { doctype: "Sales Invoice", name: invoiceName },
    );
    if (cancelRes.ok) result.invoiceCancelled = true;

    const delRes = await erpCall(
      `/api/resource/Sales Invoice/${encodeURIComponent(invoiceName)}`,
      "DELETE",
    );
    if (delRes.ok) result.invoiceDeleted = true;
    else {
      const errText = await delRes.text().catch(() => "");
      logger.warn(
        { orderName, invoiceName, status: delRes.status, err: errText.slice(0, 200) },
        "[cancelSalesOrder] invoice could not be deleted",
      );
    }
  }

  // ── 3) Cancel the Sales Order ──────────────────────────────────────────
  const soCancel = await erpCall(
    "/api/method/frappe.client.cancel",
    "POST",
    { doctype: "Sales Order", name: orderName },
  );
  if (soCancel.ok) {
    result.orderCancelled = true;
    result.ok = true;
  } else {
    const errText = await soCancel.text().catch(() => "");
    let message = "The order could not be cancelled in ERPNext.";
    try {
      const parsed = JSON.parse(errText) as { exception?: string };
      if (parsed.exception) {
        message = parsed.exception.replace(/<[^>]+>/g, "").trim();
      }
    } catch {
      /* keep the default message */
    }
    result.error = message;
    logger.warn({ orderName, message }, "[cancelSalesOrder] Sales Order cancel failed");
  }

  return result;
}
