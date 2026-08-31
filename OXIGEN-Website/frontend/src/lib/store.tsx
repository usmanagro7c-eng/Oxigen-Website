import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { catalog, type CatalogItem, slugify } from "./site-data";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type CartLine = { slug: string; qty: number };
export type User = { name: string; email: string };
export type Order = {
  id: string;
  date: string;
  status: string;
  total: number;
  item_summary?: string;
  items?: { name: string; image?: string }[];
};
export type OrderPlaced = Order & {
  items?: { slug: string; name: string; qty: number; price: number }[];
  customer?: { name: string; email: string; phone: string; address: string; city: string };
};

export type UserProfile = {
  name: string;
  email: string;
  phone: string;
  gender: string;
  dob: string;
  status: string;
  memberSince: string;
};

export type Address = {
  id: string;
  label: string;
  name: string;
  phone: string;
  line1: string;
  city: string;
  province: string;
  postal: string;
  isDefault?: boolean;
};

/* ---------- API response shapes ---------- */

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
  queued?: boolean;
  jobId?: string;
}

interface LoginResponse {
  success: boolean;
  user?: User;
  message?: string;
  error?: string;
}

interface SignupResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface CsrfResponse {
  csrfToken: string;
}

interface JobStatusResponse {
  data?: {
    id: string;
    status: string;
    orderName?: string;
  };
}

interface ErpOrderRecord {
  name: string;
  transaction_date: string;
  status: string;
  grand_total: number;
}

interface ErpAddressRecord {
  name: string;
  address_title?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  pincode?: string;
  phone?: string;
  is_primary_address?: number;
  is_shipping_address?: number;
}

interface ErpProfileRecord {
  full_name?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  mobile_no?: string;
  phone?: string;
  gender?: string;
  birth_date?: string;
}

type StoreValue = {
  cart: CartLine[];
  cartItems: (CatalogItem & { qty: number })[];
  cartCount: number;
  subtotal: number;
  /** Full product catalog: static catalog + Frappe Website Items (via API). */
  catalog: CatalogItem[];
  /** Frappe Website Items only (fetched via API). Empty until loaded. */
  apiCatalog: CatalogItem[];
  addToCart: (slug: string, qty?: number) => void;
  removeFromCart: (slug: string) => void;
  setQty: (slug: string, qty: number) => void;
  clearCart: () => void;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  wishlist: string[];
  wishlistItems: CatalogItem[];
  toggleWishlist: (slug: string) => boolean;
  inWishlist: (slug: string) => boolean;
  user: User | null;
  signIn: (usr: string, pwd: string) => Promise<boolean>;
  signUp: (email: string, full_name: string) => Promise<boolean>;
  signOut: () => Promise<boolean>;
  forgotPassword: (email: string) => Promise<boolean>;
  profile: UserProfile | null;
  fetchProfile: (email: string) => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<boolean>;
  addresses: Address[];
  fetchAddresses: (email: string) => Promise<void>;
  addAddress: (addr: Omit<Address, "id">) => Promise<boolean>;
  updateAddress: (id: string, addr: Partial<Address>) => Promise<boolean>;
  deleteAddress: (id: string) => Promise<boolean>;
  orders: Order[];
  fetchOrders: (email: string) => Promise<void>;
  placeOrder: (o: {
    items: { slug: string; qty: number }[];
    customer: { name: string; email: string; phone: string; address: string; city: string };
    paymentMethod?: string;
  }) => Promise<OrderPlaced | null>;
  cancelOrder: (orderId: string) => Promise<boolean>;
};

const StoreContext = createContext<StoreValue | null>(null);

import { API_BASE } from "./api";

/* ------------------------------------------------------------------ */
/*  Persistence helpers                                                */
/* ------------------------------------------------------------------ */

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/** Reusable hook-style helpers to fetch CSRF token and call a non-GET endpoint. */
export async function csrfToken(): Promise<string> {
  const res = await fetch(`${API_BASE}/csrf-token`, { credentials: "include" });
  const data: CsrfResponse = await res.json();
  return data.csrfToken;
}

/**
 * Perform a state-changing API request with CSRF token.
 */
async function apiCall<TBody extends Record<string, unknown>>(
  url: string,
  method: "POST" | "PUT",
  body: TBody,
): Promise<unknown> {
  const token = await csrfToken();
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
    credentials: "include",
    body: JSON.stringify(body),
  }).then((r) => r.json());
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  // API-backed products (Website Items from ERPNext), merged with the static
  // catalog so wishlist/cart slugs resolve regardless of where they came from.
  const [apiCatalog, setApiCatalog] = useState<CatalogItem[]>([]);

  // Combined lookup: static catalog first, then API-backed products. This lets
  // a saved slug resolve whether it came from a static card (long slug) or an
  // API product page (route slug) — fixing the empty-wishlist bug.
  const allCatalog = useMemo(() => {
    const seen = new Set(catalog.map((c) => c.slug));
    const merged = [...catalog];
    for (const item of apiCatalog) {
      if (!seen.has(item.slug)) {
        seen.add(item.slug);
        merged.push(item);
      }
    }
    return merged;
  }, [apiCatalog]);

  // hydrate from storage after mount (avoids SSR mismatch)
  useEffect(() => {
    setCart(load<CartLine[]>("oxi_cart", []));
    setWishlist(load<string[]>("oxi_wishlist", []));

    // Fetch the ERPNext Website Item catalog once so wishlist/cart slugs that
    // come from product pages (route-based, e.g. "nutri-cept") can be resolved.
    fetch(`${API_BASE}/items?limit=200`)
      .then((r) => r.json())
      .then((json: { data?: Record<string, unknown>[] }) => {
        const items = (json.data ?? []).map((i) => {
          const routeSlug = (i.route as string)?.split("/").pop() ?? "";
          return {
            slug: routeSlug || slugify((i.item_name as string) || (i.item_code as string) || ""),
            name: (i.web_item_name as string) || (i.item_name as string) || "",
            subtitle: (i.short_description as string) || "",
            desc: (i.description as string) || "",
            price: (i.standard_rate as number) || 0,
            was: 0,
            tag: (i.item_group as string) || "",
            img: (i.image as string)?.startsWith("http")
              ? (i.image as string)
              : i.image
                ? `${API_BASE}/items/image${i.image}`
                : `/api/placeholder/${i.item_code}`,
            gallery: [],
            highlights: [],
            ingredients: (i.web_long_description as string) || "",
            available: (i.custom_stock_qty as number | null | undefined) !== 0,
          } satisfies CatalogItem;
        });
        setApiCatalog(items);
      })
      .catch(() => {
        // Non-fatal — wishlist/cart still work for static catalog products.
      });

    // Check with server if session is still valid
    fetch(`${API_BASE}/auth/me`, { credentials: "include" })
      .then((r) => r.json())
      .then((res: ApiResponse<{ email: string; name: string }>) => {
        if (res.success && res.data) {
          setUser({ email: res.data.email, name: res.data.name });
        } else if ((res as LoginResponse).user) {
          setUser((res as LoginResponse).user ?? null);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        // Fall back to localStorage on network error
        setUser(load<User | null>("oxi_user", null));
      })
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated) save("oxi_cart", cart);
  }, [cart, hydrated]);
  useEffect(() => {
    if (hydrated) save("oxi_wishlist", wishlist);
  }, [wishlist, hydrated]);
  useEffect(() => {
    if (hydrated) save("oxi_user", user);
  }, [user, hydrated]);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const fetchOrders = async (email: string) => {
    try {
      const res: ApiResponse<ErpOrderRecord[]> = await fetch(
        `${API_BASE}/user/orders?email=${encodeURIComponent(email)}`,
        { credentials: "include" },
      ).then((r) => r.json());
      if (res.data) {
        setOrders(
          res.data.map((o) => ({
            id: o.name,
            date: o.transaction_date,
            status: o.status,
            total: o.grand_total,
            item_summary: (o as any).item_summary,
            items: (o as any).items?.map((it: any) => ({
              name: it.name,
              image: it.image,
            })) || [],
          })),
        );
      }
    } catch {
      // network error — keep stale data
    }
  };

  const fetchAddresses = async (email: string) => {
    try {
      const res: ApiResponse<ErpAddressRecord[]> = await fetch(
        `${API_BASE}/user/addresses?email=${encodeURIComponent(email)}`,
        { credentials: "include" },
      ).then((r) => r.json());
      if (res.data) {
        setAddresses(
          res.data.map((a) => {
            const title = a.address_title || "";
            const parts = title.split(" | ");
            const label = parts[0] || "Address";
            const name = parts[1] || parts[0] || "Recipient";
            return {
              id: a.name,
              label: label,
              name: name,
              phone: a.phone || "",
              line1: a.address_line1 + (a.address_line2 ? `, ${a.address_line2}` : ""),
              city: a.city || "",
              province: a.state || "",
              postal: a.pincode || "",
              isDefault: a.is_primary_address === 1 || a.is_shipping_address === 1,
            };
          }),
        );
      }
    } catch {
      // network error — keep stale data
    }
  };

  const fetchProfile = async (email: string) => {
    try {
      const res: ApiResponse<ErpProfileRecord> = await fetch(
        `${API_BASE}/user/profile?email=${encodeURIComponent(email)}`,
        { credentials: "include" },
      ).then((r) => r.json());
      if (res.data) {
        const p = res.data;
        setProfile({
          name: p.full_name || p.username || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "User",
          email: p.email || email,
          phone: p.mobile_no || p.phone || "",
          gender: p.gender || "",
          dob: p.birth_date || "",
          status: "Premium Member",
          memberSince: "March 2024",
        });
      }
    } catch {
      // network error — keep stale data
    }
  };

  useEffect(() => {
    if (hydrated && user) {
      fetchOrders(user.email);
      fetchAddresses(user.email);
      fetchProfile(user.email);
    } else if (hydrated && !user) {
      setOrders([]);
      setAddresses([]);
      setProfile(null);
    }
  }, [user, hydrated]);

  const addToCart = (slug: string, qty = 1) => {
    const product = allCatalog.find((p) => p.slug === slug);
    if (!product) return;
    if (!product.available) {
      toast.info(`${product.name} is coming soon.`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.slug === slug);
      if (existing) {
        return prev.map((l) => (l.slug === slug ? { ...l, qty: l.qty + qty } : l));
      }
      return [...prev, { slug, qty }];
    });
    toast.success(`Added to cart — ${product.name}`);
    setDrawerOpen(true);
  };

  const removeFromCart = (slug: string) => setCart((prev) => prev.filter((l) => l.slug !== slug));

  const setQty = (slug: string, qty: number) =>
    setCart((prev) =>
      qty <= 0
        ? prev.filter((l) => l.slug !== slug)
        : prev.map((l) => (l.slug === slug ? { ...l, qty } : l)),
    );

  const clearCart = () => setCart([]);

  const toggleWishlist = (slug: string) => {
    const product = allCatalog.find((p) => p.slug === slug);
    setWishlist((prev) => {
      if (prev.includes(slug)) {
        toast(`Removed from wishlist`);
        return prev.filter((s) => s !== slug);
      }
      toast.success(`Saved to wishlist${product ? ` — ${product.name}` : ""}`);
      return [...prev, slug];
    });
  };

  const inWishlist = (slug: string) => wishlist.includes(slug);

  const signUp = async (email: string, full_name: string) => {
    try {
      const res: SignupResponse = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, full_name }),
      }).then((r) => r.json());

      if (!res.success) {
        toast.error(res.error || "Sign up failed.");
        return false;
      }
      toast.success("Account created! Check your email to set your password.");
      return true;
    } catch {
      toast.error("An unexpected error occurred during sign up.");
      return false;
    }
  };

  const signIn = async (usr: string, pwd: string) => {
    try {
      const res: LoginResponse = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ usr, pwd }),
      }).then((r) => r.json());

      if (!res.success) {
        toast.error(res.error || "Sign in failed.");
        return false;
      }
      setUser(res.user ?? null);
      toast.success(`Welcome back, ${res.user?.name}!`);
      return true;
    } catch {
      toast.error("An unexpected error occurred during sign in.");
      return false;
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const token = await csrfToken();
      const res: { message?: string; error?: string } = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
        credentials: "include",
        body: JSON.stringify({ email }),
      }).then((r) => r.json());

      if (res.error) {
        toast.error(res.error);
        return false;
      }
      toast.success(res.message || "If this email is registered, a reset link has been sent.");
      return true;
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
      return false;
    }
  };

  const signOut = async () => {
    // Always clear local state first so the UI updates immediately,
    // even if the network request fails (e.g. backend is offline).
    setUser(null);
    toast("Signed out.");
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Network error is non-fatal — local state is already cleared.
    }
    return true;
  };

  const updateProfile = async (patch: Partial<UserProfile>) => {
    try {
      if (!user) return false;

      const nameParts = (patch.name || "").split(" ");
      const first_name = nameParts[0] || "";
      const last_name = nameParts.slice(1).join(" ") || "";

      const payload: Record<string, string | undefined> = { email: user.email };

      if (patch.name !== undefined) {
        payload.full_name = patch.name;
        payload.first_name = first_name;
        payload.last_name = last_name;
      }
      if (patch.phone !== undefined) {
        payload.phone = patch.phone;
        payload.mobile_no = patch.phone;
      }
      if (patch.gender !== undefined) payload.gender = patch.gender;
      if (patch.dob !== undefined) payload.birth_date = patch.dob;

      const res = await apiCall(`${API_BASE}/user/profile`, "PUT", payload as Record<string, unknown>) as ApiResponse<ErpProfileRecord>;

      if (res.data) {
        fetchProfile(user.email);
        return true;
      } else {
        toast.error((res as { error?: string }).error || "Failed to update profile.");
        return false;
      }
    } catch {
      toast.error("Failed to update profile.");
      return false;
    }
  };

  const addAddress = async (addr: Omit<Address, "id">) => {
    try {
      const token = await csrfToken();
      const res: ApiResponse<ErpAddressRecord> = await fetch(`${API_BASE}/user/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
        credentials: "include",
        body: JSON.stringify({
          address_title: `${addr.label} | ${addr.name}`,
          address_type: "Shipping",
          address_line1: addr.line1,
          city: addr.city,
          state: addr.province,
          country: "Pakistan",
          pincode: addr.postal,
          phone: addr.phone,
        }),
      }).then((r) => r.json());

      if (res.data) {
        if (user) fetchAddresses(user.email);
        return true;
      } else {
        toast.error((res as { error?: string }).error || "Failed to add address.");
        return false;
      }
    } catch {
      toast.error("Failed to add address.");
      return false;
    }
  };

  const updateAddress = async (id: string, addr: Partial<Address>) => {
    try {
      const token = await csrfToken();
      const payload: Record<string, string | number> = {};

      if (addr.label && addr.name) {
        payload.address_title = `${addr.label} | ${addr.name}`;
      } else if (addr.label || addr.name) {
        const existing = addresses.find((a) => a.id === id);
        const l = addr.label ?? existing?.label ?? "Address";
        const n = addr.name ?? existing?.name ?? "Recipient";
        payload.address_title = `${l} | ${n}`;
      }

      if (addr.line1) payload.address_line1 = addr.line1;
      if (addr.city) payload.city = addr.city;
      if (addr.province) payload.state = addr.province;
      if (addr.postal) payload.pincode = addr.postal;
      if (addr.phone) payload.phone = addr.phone;
      if (addr.isDefault !== undefined) {
        payload.is_primary_address = addr.isDefault ? 1 : 0;
        payload.is_shipping_address = addr.isDefault ? 1 : 0;
      }

      const res: ApiResponse<ErpAddressRecord> = await fetch(`${API_BASE}/user/addresses/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
        credentials: "include",
        body: JSON.stringify(payload),
      }).then((r) => r.json());

      if (res.data) {
        if (user) fetchAddresses(user.email);
        return true;
      } else {
        toast.error((res as { error?: string }).error || "Failed to update address.");
        return false;
      }
    } catch {
      toast.error("Failed to update address.");
      return false;
    }
  };

  const deleteAddress = async (id: string) => {
    try {
      const token = await csrfToken();
      const res: { message?: string; error?: string } = await fetch(`${API_BASE}/user/addresses/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": token },
        credentials: "include",
      }).then((r) => r.json());

      if (res.message) {
        if (user) fetchAddresses(user.email);
        return true;
      } else {
        toast.error(res.error || "Failed to delete address.");
        return false;
      }
    } catch {
      toast.error("Failed to delete address.");
      return false;
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      const token = await csrfToken();
      const res: { message?: string; error?: string } = await fetch(`${API_BASE}/user/orders/${encodeURIComponent(orderId)}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": token },
        credentials: "include",
      }).then((r) => r.json());

      if (res.message) {
        toast.success(res.message);
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        return true;
      } else {
        toast.error(res.error || "Failed to cancel order.");
        return false;
      }
    } catch {
      toast.error("Failed to cancel order.");
      return false;
    }
  };

  const removeOrder = async (orderId: string) => {
    try {
      const token = await csrfToken();
      const res: { message?: string; error?: string } = await fetch(`${API_BASE}/user/orders/${encodeURIComponent(orderId)}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
        credentials: "include",
      }).then((r) => r.json());

      if (res.message) {
        toast.success(res.message);
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        return true;
      } else {
        toast.error(res.error || "Failed to remove order.");
        return false;
      }
    } catch {
      toast.error("Failed to remove order.");
      return false;
    }
  };

  const placeOrder = async (o: {
    items: { slug: string; qty: number }[];
    customer: { name: string; email: string; phone: string; address: string; city: string };
    paymentMethod?: string;
  }) => {
    try {
      const bodyPayload = {
        email: o.customer.email,
        items: o.items.map((i) => ({ item_code: i.slug, qty: i.qty })),
        shippingAddress: {
          address_line1: o.customer.address,
          city: o.customer.city,
          country: "Pakistan",
          phone: o.customer.phone,
        },
        payment_method: o.paymentMethod || "Cash on Delivery",
      };

      const res: ApiResponse<unknown> & {
        jobId?: string;
        orderName?: string;
        queued?: boolean;
      } = await fetch(`${API_BASE}/user/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": await csrfToken() },
        credentials: "include",
        body: JSON.stringify(bodyPayload),
      }).then((r) => r.json());

      // Direct placement succeeded — ERPNext placed the order immediately.
      if (res.queued === false && res.orderName) {
        const orderItems = o.items.map((it) => {
          const product = allCatalog.find((c) => c.slug === it.slug);
          return {
            slug: it.slug,
            name: product?.name || it.slug,
            qty: it.qty,
            price: product?.price || 0,
          };
        });
        const totalAmount = orderItems.reduce((s, it) => s + it.price * it.qty, 0);
        const placedOrder: OrderPlaced = {
          id: res.orderName,
          date: new Date().toISOString().split("T")[0],
          status: "To Deliver",
          total: totalAmount,
          customer: o.customer,
          items: orderItems,
        };
        setOrders((prev) => [placedOrder, ...prev]);
        toast.success("Order placed successfully!");
        clearCart();
        return placedOrder;
      }

      // No job id and no order name — genuine failure.
      if (!res.queued && !res.orderName) {
        toast.error((res as { error?: string }).error || "Order placement failed.");
        return null;
      }

      const jobId = res.jobId!;
      toast.info("Order added to queue. Processing...");

      // Poll queue status
      const poll = (): Promise<string | null> => {
        return new Promise((resolvePoll) => {
          const interval = setInterval(async () => {
            try {
              const jobRes: JobStatusResponse = await fetch(`${API_BASE}/user/orders/job/${jobId}`, { credentials: "include" }).then((r) => r.json());
              const job = jobRes.data;
              if (job) {
                if (job.status === "completed") {
                  clearInterval(interval);
                  resolvePoll(job.orderName || "Completed");
                } else if (job.status === "failed" || job.status === "dead") {
                  clearInterval(interval);
                  resolvePoll(null);
                }
              }
            } catch {
              // Ignore network errors
            }
          }, 1500);
        });
      };

      const orderName = await poll();
      if (!orderName) {
        toast.error("Failed to process order in queue.");
        return null;
      }

      const orderItems = o.items.map((it) => {
        const product = allCatalog.find((c) => c.slug === it.slug);
        return {
          slug: it.slug,
          name: product?.name || it.slug,
          qty: it.qty,
          price: product?.price || 0,
        };
      });

      const totalAmount = orderItems.reduce((s, it) => s + it.price * it.qty, 0);

      const placedOrder: OrderPlaced = {
        id: orderName,
        date: new Date().toISOString().split("T")[0],
        status: "To Deliver",
        total: totalAmount,
        customer: o.customer,
        items: orderItems,
      };

      setOrders((prev) => [placedOrder, ...prev]);
      clearCart();
      return placedOrder;
    } catch {
      toast.error("An unexpected error occurred while placing order.");
      return null;
    }
  };

  const value = useMemo<StoreValue>(() => {
    const cartItems = cart
      .map((l) => {
        const p = allCatalog.find((c) => c.slug === l.slug);
        return p ? { ...p, qty: l.qty } : null;
      })
      .filter(Boolean) as (CatalogItem & { qty: number })[];
    const cartCount = cart.reduce((s, l) => s + l.qty, 0);
    const subtotal = cartItems.reduce((s, l) => s + l.price * l.qty, 0);
    const wishlistItems = wishlist
      .map((s) => allCatalog.find((c) => c.slug === s))
      .filter(Boolean) as CatalogItem[];

    return {
      cart,
      cartItems,
      cartCount,
      subtotal,
      catalog: allCatalog,
      apiCatalog,
      addToCart,
      removeFromCart,
      setQty,
      clearCart,
      drawerOpen,
      setDrawerOpen,
      wishlist,
      wishlistItems,
      toggleWishlist,
      inWishlist,
      user,
      signIn,
      signUp,
      signOut,
      forgotPassword,
      profile,
      fetchProfile,
      updateProfile,
      addresses,
      fetchAddresses,
      addAddress,
      updateAddress,
      deleteAddress,
      orders,
      placeOrder,
      cancelOrder,
      removeOrder,
      fetchOrders,
    } as unknown as StoreValue;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, wishlist, user, orders, drawerOpen, profile, addresses, allCatalog]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
