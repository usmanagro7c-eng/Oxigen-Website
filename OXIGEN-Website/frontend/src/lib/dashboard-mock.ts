// Placeholder data for dashboard UI — replace with real API calls when wiring the backend.

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
};

export const mockNotifications: NotificationItem[] = [
  { id: "n1", type: "order", title: "Order Confirmed", body: "Your order has been confirmed and is being processed.", time: "10 min ago", read: false },
  { id: "n2", type: "shipping", title: "Shipped", body: "Your order has been dispatched.", time: "1 day ago", read: false },
  { id: "n3", type: "promo", title: "Flash Sale!", body: "Up to 25% off on Nutri-Cept & OxiDop — today only.", time: "3 days ago", read: true },
  { id: "n4", type: "account", title: "Welcome", body: "Welcome to OxiGen!", time: "1 week ago", read: true },
];

export const mockDevices: { id: string; device: string; location: string; lastActive: string; current?: boolean }[] = [];

export const mockLoginHistory: { id: string; when: string; device: string; ip: string; status: "Success" | "Blocked" }[] = [];

export const mockTickets: { id: string; subject: string; status: "Open" | "Pending" | "Resolved"; updated: string }[] = [];

export const mockFaqs = [
  { q: "How long does delivery take?", a: "Orders are delivered within 2–4 business days across Pakistan." },
  { q: "Can I return a product?", a: "Yes, unopened products can be returned within 7 days of delivery." },
  { q: "Are products authentic?", a: "100% authentic and sealed — directly sourced from OxiGen warehouses." },
  { q: "Do you offer Cash on Delivery?", a: "Yes, COD is available on all orders across Pakistan." },
];
