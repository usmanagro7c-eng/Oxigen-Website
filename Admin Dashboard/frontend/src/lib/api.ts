/**
 * Frontend API Client
 * Connects to the Oxigen backend (Express + ERPNext/Frappe)
 */

export const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include", // include cookies for CSRF/session
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.error || error.message || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── CSRF Token ──────────────────────────────────────────────────────────────
export async function getCsrfToken(): Promise<string> {
  const data = await fetchApi<{ csrfToken: string }>("/csrf-token");
  return data.csrfToken;
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export interface SignupPayload {
  full_name: string;
  email: string;
  password: string;
}

export interface AuthUser {
  email: string;
  name: string;
}

export interface AuthResponse {
  success: boolean;
  queued?: boolean;
  message: string;
  user?: AuthUser;
}

export async function signup(payload: SignupPayload): Promise<AuthResponse> {
  const csrfToken = await getCsrfToken();
  return fetchApi("/auth/signup", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(payload),
  });
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const csrfToken = await getCsrfToken();
  return fetchApi("/auth/login", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ usr: email, pwd: password }),
  });
}

export async function logout(): Promise<{ success: boolean; message: string }> {
  const csrfToken = await getCsrfToken();
  return fetchApi("/auth/logout", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
  });
}

export async function getMe(): Promise<AuthUser | null> {
  try {
    const data = await fetchApi<{ success: boolean; user: AuthUser | null }>("/auth/me");
    return data.user ?? null;
  } catch {
    return null;
  }
}

export async function forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
  const csrfToken = await getCsrfToken();
  return fetchApi("/auth/forgot-password", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, new_password: string): Promise<{ success: boolean; message: string }> {
  const csrfToken = await getCsrfToken();
  return fetchApi("/auth/reset-password", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ token, new_password }),
  });
}

// ─── Customer ────────────────────────────────────────────────────────────────
export interface CustomerProfile {
  name: string;
  customer_name: string;
  customer_primary_contact: string;
  image: string;
  customer_group: string;
  territory: string;
  mobile_no: string;
  email_id: string;
  creation: string;
}

export interface Address {
  name: string;
  address_title: string;
  address_type: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  phone: string;
  email_id: string;
  is_primary_address: number;
  is_shipping_address: number;
}

export interface Order {
  name: string;
  transaction_date: string;
  status: string;
  grand_total: number;
  currency: string;
}

export async function getCustomerProfile(): Promise<{ data: CustomerProfile }> {
  return fetchApi("/customer/profile");
}

export async function updateCustomerProfile(patch: Partial<CustomerProfile>): Promise<{ data: CustomerProfile }> {
  const csrfToken = await getCsrfToken();
  return fetchApi("/customer/profile", {
    method: "PUT",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(patch),
  });
}

export async function getOrders(): Promise<{ data: Order[] }> {
  return fetchApi("/customer/orders");
}

export async function getAddresses(): Promise<{ data: Address[] }> {
  return fetchApi("/customer/addresses");
}

export async function createAddress(address: Partial<Address>): Promise<{ data: Address }> {
  const csrfToken = await getCsrfToken();
  return fetchApi("/customer/addresses", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(address),
  });
}

export async function updateAddress(name: string, address: Partial<Address>): Promise<{ data: Address }> {
  const csrfToken = await getCsrfToken();
  return fetchApi(`/customer/addresses/${name}`, {
    method: "PUT",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(address),
  });
}

export async function deleteAddress(name: string): Promise<{ message: string }> {
  const csrfToken = await getCsrfToken();
  return fetchApi(`/customer/addresses/${name}`, {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
  });
}

export async function changePassword(old_password: string, new_password: string): Promise<{ message: string }> {
  const csrfToken = await getCsrfToken();
  return fetchApi("/customer/change-password", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ old_password, new_password }),
  });
}

export async function uploadProfileImage(file: File): Promise<{ data: { image: string } }> {
  const csrfToken = await getCsrfToken();
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(`${API_BASE}/customer/profile-image`, {
    method: "POST",
    credentials: "include",
    headers: {
      "X-CSRF-Token": csrfToken,
    },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Upload failed" }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── Items (Products) ────────────────────────────────────────────────────────
export interface Item {
  name?: string;
  item_code: string;
  item_name: string;
  item_group: string;
  brand: string | null;
  standard_rate: number;
  valuation_rate?: number;
  image: string | null;
  website_image: string | null;
  description: string;
  short_description?: string;
  stock_qty: number;
  is_stock_item: number;
  is_published: number;
  custom_stock_qty?: number;
  stock_uom?: string;
}

export interface ItemGroup {
  name: string;
  item_group_name: string;
  is_group?: number;
  parent_item_group?: string | null;
  image?: string | null;
  description?: string;
  slug?: string;
}

export async function getItems(params?: { search?: string; limit?: number; _t?: string }): Promise<{ data: Item[]; version?: number }> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?._t) query.set("_t", params._t);
  const qs = query.toString();
  return fetchApi(`/items${qs ? `?${qs}` : ""}`);
}

export async function getItemGroups(): Promise<{ data: ItemGroup[] }> {
  return fetchApi("/items/groups");
}

export async function getItemDetail(name: string): Promise<{ data: Item }> {
  return fetchApi(`/items/${encodeURIComponent(name)}`);
}

export async function createItem(payload: any): Promise<{ data: { name: string; item_code: string } }> {
  const csrfToken = await getCsrfToken();
  return fetchApi("/items", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(payload),
  });
}

export async function updateItem(name: string, payload: any): Promise<{ data: Item }> {
  const csrfToken = await getCsrfToken();
  return fetchApi(`/items/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(payload),
  });
}

export async function deleteItem(name: string): Promise<{ success: boolean; message: string }> {
  const csrfToken = await getCsrfToken();
  return fetchApi(`/items/${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
  });
}

export async function createItemGroup(payload: any): Promise<{ data: ItemGroup }> {
  const csrfToken = await getCsrfToken();
  return fetchApi("/items/groups", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(payload),
  });
}

export async function updateItemGroup(name: string, payload: any): Promise<{ data: ItemGroup }> {
  const csrfToken = await getCsrfToken();
  return fetchApi(`/items/groups/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(payload),
  });
}

export async function deleteItemGroup(name: string): Promise<{ success: boolean; message: string }> {
  const csrfToken = await getCsrfToken();
  return fetchApi(`/items/groups/${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
  });
}

export function getItemImageUrl(filepath: string): string {
  return `${API_BASE}/items/image/${encodeURIComponent(filepath)}`;
}

// ─── Health ──────────────────────────────────────────────────────────────────
export async function healthCheck(): Promise<{ status: string; environment: string; timestamp: string; queue: unknown }> {
  return fetch(`${API_BASE.replace("/api", "")}/health`).then(r => r.json());
}

// ─── User (dashboard) ───────────────────────────────────────────────────────
export interface UserProfile {
  name: string;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  mobile_no: string;
  phone: string;
  username: string;
  gender: string;
  birth_date: string;
}

export interface SalesOrder {
  name: string;
  transaction_date: string;
  delivery_date?: string;
  status: string;
  grand_total: number;
  currency: string;
  customer?: string;
  customer_name?: string;
  owner?: string;
  modified?: string;
}

export interface OrderDetail extends SalesOrder {
  customer: string;
  customer_name: string;
  docstatus: number;
  items: Array<{ item_code: string; item_name: string; qty: number; rate: number; amount: number }>;
}

export async function getUserProfile(email: string): Promise<{ data: UserProfile }> {
  return fetchApi(`/user/profile?email=${encodeURIComponent(email)}`);
}

export async function updateUserProfile(email: string, patch: Partial<Omit<UserProfile, "name" | "email">>): Promise<{ data: UserProfile }> {
  const csrfToken = await getCsrfToken();
  return fetchApi("/user/profile", {
    method: "PUT",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ email, ...patch }),
  });
}

export async function getUserOrders(email: string): Promise<{ data: SalesOrder[] }> {
  return fetchApi(`/user/orders?email=${encodeURIComponent(email)}`);
}

export async function getUserOrderDetail(name: string): Promise<{ data: OrderDetail }> {
  return fetchApi(`/user/orders/${encodeURIComponent(name)}`);
}

export async function cancelOrder(name: string): Promise<{ message: string }> {
  const csrfToken = await getCsrfToken();
  return fetchApi(`/user/orders/${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
  });
}

export async function getUserAddresses(email: string): Promise<{ data: Address[] }> {
  return fetchApi(`/user/addresses?email=${encodeURIComponent(email)}`);
}

export async function createUserAddress(address: Partial<Address>): Promise<{ data: Address }> {
  const csrfToken = await getCsrfToken();
  return fetchApi("/user/addresses", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(address),
  });
}

export async function updateUserAddress(name: string, address: Partial<Address>): Promise<{ data: Address }> {
  const csrfToken = await getCsrfToken();
  return fetchApi(`/user/addresses/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(address),
  });
}

export async function deleteUserAddress(name: string): Promise<{ message: string }> {
  const csrfToken = await getCsrfToken();
  return fetchApi(`/user/addresses/${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
  });
}

export async function placeOrder(payload: {
  email?: string;
  items: Array<{ item_code: string; qty: number }>;
  delivery_date?: string;
  addressName?: string;
  shippingAddress?: Record<string, string>;
  setAsDefault?: boolean;
}): Promise<{ queued: boolean; orderName?: string; message: string; jobId?: string }> {
  const csrfToken = await getCsrfToken();
  return fetchApi("/user/orders", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(payload),
  });
}

export async function getOrderJobStatus(jobId: string): Promise<{ data: unknown }> {
  return fetchApi(`/user/orders/job/${encodeURIComponent(jobId)}`);
}

// ─── ERP Stats & Analytics ──────────────────────────────────────────────────
export interface DashboardStats {
  revenue: number;
  ordersCount: number;
  customersCount: number;
  productsCount: number;
  monthlyRevenue: number[];
  monthlyOrders: number[];
  monthLabels: string[];
  recentOrders: Array<{
    id: string;
    rawId: string;
    customer: string;
    total: string;
    numericTotal: number;
    status: string;
    date: string;
    modified?: string;
  }>;
  topProducts: Array<{
    name: string;
    code: string;
    stock: number;
    group: string;
    price: number;
    image: string | null;
    soldPct: number;
  }>;
  inventory: {
    inStock: number;
    lowStock: number;
    outOfStock: number;
    total: number;
  };
  activity: Array<{
    id: string;
    type: string;
    text: string;
    time: string;
    timestamp: number;
  }>;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return fetchApi("/erp/stats");
}

// ─── Generic ERP Resource CRUD ──────────────────────────────────────────────
export async function getErpResource<T = any>(doctype: string, params?: Record<string, any>): Promise<{ data: T[] }> {
  const query = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        query.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
      }
    }
  }
  const qs = query.toString();
  return fetchApi(`/erp/resource/${encodeURIComponent(doctype)}${qs ? `?${qs}` : ""}`);
}

export async function getErpDoc<T = any>(doctype: string, name: string): Promise<{ data: T }> {
  return fetchApi(`/erp/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`);
}

export async function createErpDoc<T = any>(doctype: string, body: Record<string, any>): Promise<{ data: T }> {
  const csrfToken = await getCsrfToken();
  return fetchApi(`/erp/resource/${encodeURIComponent(doctype)}`, {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body),
  });
}

export async function updateErpDoc<T = any>(doctype: string, name: string, body: Record<string, any>): Promise<{ data: T }> {
  const csrfToken = await getCsrfToken();
  return fetchApi(`/erp/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body),
  });
}

export async function deleteErpDoc(doctype: string, name: string): Promise<{ success: boolean; message: string }> {
  const csrfToken = await getCsrfToken();
  return fetchApi(`/erp/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
  });
}

// ─── Admin (Orders, Customers, Inventory, Discounts, Users, Files) ─────────
export interface InventoryRow {
  item_code: string;
  item_name: string;
  warehouse: string;
  actual_qty: number;
  reserved_qty: number;
  available_qty: number;
  in_stock: boolean;
}

export async function getAdminInventory(): Promise<{ data: InventoryRow[] }> {
  return fetchApi("/admin/inventory");
}

export async function adjustAdminInventory(payload: {
  item_code: string;
  qty: number;
  warehouse?: string;
  entry_type?: string;
  mode?: "set" | "add" | "deduct" | "adjust";
}): Promise<{ success: boolean; data: any }> {
  const csrfToken = await getCsrfToken();
  return fetchApi("/admin/inventory/adjust", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(payload),
  });
}

export interface AdminOrder {
  name: string;
  customer: string;
  customer_name: string;
  status: string;
  grand_total: number;
  currency: string;
  transaction_date: string;
  delivery_date?: string;
  modified: string;
  owner: string;
  shipping?: {
    title?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
    phone?: string;
    email?: string;
  } | null;
}

export async function getAdminOrders(): Promise<{ data: AdminOrder[] }> {
  return fetchApi("/admin/orders");
}

export async function getAdminOrderDetail(name: string): Promise<{ data: any }> {
  return fetchApi(`/admin/orders/${encodeURIComponent(name)}`);
}

export async function createAdminOrder(payload: any): Promise<{ data: any }> {
  const csrfToken = await getCsrfToken();
  return fetchApi("/admin/orders", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(payload),
  });
}

export async function updateAdminOrder(name: string, payload: any): Promise<{ data: any }> {
  const csrfToken = await getCsrfToken();
  return fetchApi(`/admin/orders/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminOrder(name: string): Promise<{ success: boolean; message: string }> {
  const csrfToken = await getCsrfToken();
  return fetchApi(`/admin/orders/${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
  });
}

export interface AdminCustomer {
  name: string;
  customer_name: string;
  customer_type?: string;
  customer_group?: string;
  territory?: string;
  email_id?: string;
  mobile_no?: string;
  creation?: string;
  modified?: string;
}

export async function getAdminCustomers(): Promise<{ data: AdminCustomer[] }> {
  return fetchApi("/admin/customers");
}

export async function getAdminCustomer(name: string): Promise<{ data: AdminCustomer }> {
  return fetchApi(`/admin/customers/${encodeURIComponent(name)}`);
}

export async function createAdminCustomer(payload: any): Promise<{ data: AdminCustomer }> {
  const csrfToken = await getCsrfToken();
  return fetchApi("/admin/customers", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(payload),
  });
}

export async function updateAdminCustomer(name: string, payload: any): Promise<{ data: AdminCustomer }> {
  const csrfToken = await getCsrfToken();
  return fetchApi(`/admin/customers/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminCustomer(name: string): Promise<{ success: boolean; message: string }> {
  const csrfToken = await getCsrfToken();
  return fetchApi(`/admin/customers/${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
  });
}

export async function getAdminDiscounts(): Promise<{ data: any[] }> {
  return fetchApi("/admin/discounts");
}

export async function createAdminDiscount(payload: any): Promise<{ data: any }> {
  const csrfToken = await getCsrfToken();
  return fetchApi("/admin/discounts", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminDiscount(name: string): Promise<{ success: boolean; message: string }> {
  const csrfToken = await getCsrfToken();
  return fetchApi(`/admin/discounts/${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
  });
}

export async function getAdminUsers(): Promise<{ data: any[] }> {
  return fetchApi("/admin/users");
}

export async function createAdminUser(payload: any): Promise<{ data: any }> {
  const csrfToken = await getCsrfToken();
  return fetchApi("/admin/users", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(payload),
  });
}

export async function updateAdminUser(name: string, payload: any): Promise<{ data: any }> {
  const csrfToken = await getCsrfToken();
  return fetchApi(`/admin/users/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminUser(name: string): Promise<{ success: boolean; message: string }> {
  const csrfToken = await getCsrfToken();
  return fetchApi(`/admin/users/${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
  });
}

export async function getAdminFiles(): Promise<{ data: any[] }> {
  return fetchApi("/admin/files");
}

export async function deleteAdminFile(name: string): Promise<{ success: boolean; message: string }> {
  const csrfToken = await getCsrfToken();
  return fetchApi(`/admin/files/${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
  });
}

export async function markNotificationRead(id?: string): Promise<{ success: boolean; unread: number }> {
  const csrfToken = await getCsrfToken();
  return fetchApi("/admin/notifications/mark-read", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(id ? { id } : {}),
  });
}

export async function clearNotifications(): Promise<{ success: boolean; unread: number }> {
  const csrfToken = await getCsrfToken();
  return fetchApi("/admin/notifications/clear", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
  });
}

export async function deleteNotification(id: string): Promise<{ success: boolean; unread: number }> {
  const csrfToken = await getCsrfToken();
  return fetchApi(`/admin/notifications/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
  });
}

export async function uploadAdminFile(file: File): Promise<{ data: any }> {
  const csrfToken = await getCsrfToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/admin/files/upload`, {
    method: "POST",
    credentials: "include",
    headers: {
      "X-CSRF-Token": csrfToken,
    },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "File upload failed." }));
    throw new Error(error.error || error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export interface MonitorResponse {
  timestamp: string;
  erpnext: { alive: boolean; latencyMs: number };
  queue: {
    pending: number;
    processing: number;
    dead: number;
    completed: number;
    submitted: number;
    erpProcessing: number;
    erpCompleted: number;
    total: number;
    backlogAlert: boolean;
    queueCapPercent: number;
    maxQueueSize: number;
    alertThreshold: number;
  };
  circuit: { state: string; consecutiveFailures: number };
  dlq: unknown[];
  pendingJobs: unknown[];
  processingJobs: unknown[];
  submittedJobs: unknown[];
  salesOrders: SalesOrder[];
  processingOrders: SalesOrder[];
  completedOrders: SalesOrder[];
}

export async function getAdminMonitor(): Promise<MonitorResponse> {
  return fetchApi("/admin/monitor");
}
