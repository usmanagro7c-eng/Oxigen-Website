import { EventEmitter } from "events";

export type Notification = {
  id: string;
  cat: "orders" | "inventory" | "ai" | "marketing";
  icon: string;
  tone: string;
  title: string;
  body: string;
  when: string;
  timestamp: number;
  unread: boolean;
  metadata?: Record<string, any>;
};

class NotificationService extends EventEmitter {
  private notifications: Notification[] = [
    {
      id: "notif-init-1",
      cat: "orders",
      icon: "ShoppingCart",
      tone: "from-emerald-500 to-teal-500",
      title: "Welcome to OxiGen Live Orders",
      body: "Live order notifications are active. New checkout orders will appear instantly.",
      when: "Just now",
      timestamp: Date.now(),
      unread: true,
    },
  ];

  public addOrderNotification(order: {
    orderId?: string;
    customerName?: string;
    email: string;
    city?: string;
    total?: number;
    itemCount?: number;
    paymentMethod?: string;
    items?: any[];
  }): Notification {
    const id = "ord-notif-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
    const orderId = order.orderId || `ORD-${Date.now().toString().slice(-5)}`;
    const customer = order.customerName || order.email.split("@")[0] || "Customer";
    const amountStr = order.total ? `Rs. ${Number(order.total).toLocaleString()}` : "COD";
    const cityStr = order.city ? ` · ${order.city}` : "";
    const countStr = order.itemCount ? ` (${order.itemCount} item${order.itemCount > 1 ? "s" : ""})` : "";
    const body = `${customer} · ${amountStr}${cityStr}${countStr}`;

    const notif: Notification = {
      id,
      cat: "orders",
      icon: "ShoppingCart",
      tone: "from-emerald-500 to-teal-500",
      title: `New order #${orderId}`,
      body,
      when: "Just now",
      timestamp: Date.now(),
      unread: true,
      metadata: order,
    };

    this.notifications.unshift(notif);
    if (this.notifications.length > 200) {
      this.notifications = this.notifications.slice(0, 200);
    }

    this.emit("notification", notif);
    this.emit("change");
    return notif;
  }

  public getAll(): Notification[] {
    return this.notifications;
  }

  public getUnreadCount(): number {
    return this.notifications.filter((n) => n.unread).length;
  }

  public markAsRead(id?: string): void {
    if (!id) {
      this.notifications.forEach((n) => (n.unread = false));
    } else {
      const item = this.notifications.find((n) => n.id === id);
      if (item) item.unread = false;
    }
    this.emit("change");
  }

  public clear(): void {
    this.notifications = [];
    this.emit("change");
  }
}

export const notificationService = new NotificationService();
