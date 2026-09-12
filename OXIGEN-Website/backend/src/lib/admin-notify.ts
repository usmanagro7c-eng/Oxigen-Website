import { logger } from "./logger.js";
import { notificationService } from "../services/notification.service.js";

/**
 * Fire-and-forget bridge that pushes a notification about a newly placed order
 * to the (in-process) admin notification service + SSE stream.
 *
 * Must never throw into the order placement path — any failure here is logged
 * and swallowed so customer checkout is never blocked by the admin channel.
 */

type OrderPayload = {
  email?: string;
  items?: { item_code?: string; item_name?: string; qty?: number; name?: string; subtitle?: string; price?: number }[];
  shippingAddress?: { city?: string };
  payment_method?: string;
};

export function notifyAdminOfOrder({
  orderName,
  payload,
  total,
}: {
  orderName: string;
  payload: OrderPayload;
  total?: number;
}): void {
  const email = payload.email ?? "";
  if (!email) {
    logger.warn({ orderName }, "admin-notify: no email, skipping notification");
    return;
  }

  const customerName = email.split("@")[0] || "";
  const city = payload.shippingAddress?.city;

  try {
    notificationService.addOrderNotification({
      orderId: orderName,
      customerName,
      email,
      city,
      total: typeof total === "number" && total > 0 ? total : 0,
      itemCount: Array.isArray(payload.items) ? payload.items.length : 1,
      paymentMethod: payload.payment_method || "Cash on Delivery",
      items: (payload.items ?? []).map((i) => ({
        name: i.item_name || i.item_code || i.name || i.subtitle || "Item",
        qty: i.qty ?? 1,
        price: i.price ?? 0,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.debug({ err: msg, orderName }, "admin-notify: failed to notify admin (non-blocking)");
  }
}