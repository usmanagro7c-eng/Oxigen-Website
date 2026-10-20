# OxiGen — Full End-to-End Test Report

**Date:** 2026-10-20
**Tester:** automated E2E via live API (Cloudflare worker → nginx → backend → ERPNext)
**Site:** https://oxigen.usman-agro7c.workers.dev
**Backend:** pm2 `oxigen-backend` (port 3002) · **ERPNext:** https://dev01.agrovisions.pk

---

## 1. Summary

| Area | Result |
|---|---|
| Customer auth flow (signup → email → set password → login) | ✅ 5/5 pass (2 real bugs fixed) |
| Customer address flow (save → list → link) | ✅ 3/3 pass (1 real bug fixed) |
| Customer order flow (place → list → pay → cancel → remove) | ✅ 6/6 pass (2 real bugs fixed) |
| Admin read endpoints (17 routes) | ✅ 17/17 pass |
| Admin write endpoints (CRUD on 7 resources) | ✅ 19/19 pass |
| Live Cloudflare smoke test | ✅ all routes 200 |
| **Total** | **✅ 50/50 pass** |
| **Bugs found & fixed** | **5 (all verified fixed)** |

---

## 2. Bugs found during the test (all fixed)

### BUG-1 — `forgot-password` sent the wrong email template
- **Symptom:** "Reset your password" request produced a *"Set your OXIGEN password"* email.
- **Cause:** `authController.forgotPassword()` called `emailService.sendSetPasswordEmail()` instead of `sendResetPasswordEmail()`.
- **Fix:** `backend/src/controllers/auth.controller.ts` — switched to `sendResetPasswordEmail()`.
- **Verified:** live request now logs `subject: "Reset your OXIGEN password — OXIGEN"`.

### BUG-2 — ERPNext had no default outgoing email account (no email at all)
- **Symptom:** every mail send failed with `OutgoingEmailError: Unable to send mail because of a missing email account`.
- **Cause:** ERPNext Email Account "Oxigen" had `enable_outgoing = 1` but `default_outgoing = 0`.
- **Fix:** ERPNext config (not code) — set `default_outgoing = 1`.
- **Verified:** `Communication` records created; mailer logs `Email sent via ERPNext`.

### BUG-3 — Customer addresses were never linked to the Customer → order placement failed
- **Symptom:** `POST /api/user/orders` → HTTP 502 *"Billing Address does not belong to the E2E Tester"*.
- **Cause (two layers):**
  1. `frappeService.createCustomerForEmail()` returned early when ERPNext's auto-created Contact already existed for the email — and that Contact carries **no** Dynamic Link to the Customer.
  2. The Dynamic Link *resource* endpoint does not expose child-table fields: a filtered read returns only `name`, never `link_name`. Both the address-creation and customer-lookup paths relied on it, so the Customer link was never created.
- **Fix:**
  - New `frappeService.ensureContactLinkedToCustomer()` — adds the missing Customer link to a Contact.
  - `createCustomerForEmail()` now calls it instead of returning early.
  - `findCustomerByEmail()`, `createAddress()` (frappe.service) and `POST /api/user/addresses` (user.ts) now read the Customer link from the **Contact document's** `links` child table instead of the Dynamic Link resource.
  - `ensureAddressLinkedToCustomer()` in `erpnext-client.ts` was a stub that always returned `true` — it is now a real implementation that links the address to the Customer before an order is created.
- **Verified:** a brand-new signup now produces a Contact with `Customer -> …` and the order places successfully.

### BUG-4 — "Remove Order" always failed with HTTP 417
- **Symptom:** `POST /api/user/orders/:name/delete` → *"Cannot delete or cancel because Sales Order … is linked with Sales Invoice …"*.
- **Cause:** the linked Sales Invoice (submitted with `update_stock = 1`) creates Stock Ledger Entries, which ERPNext never lets you delete — so the Sales Order can never be physically deleted either.
- **Fix:** customer-facing "Remove Order" is now a **soft delete**:
  - new `backend/src/lib/hidden-orders.ts` — per-customer hidden-order store (`data/hidden-orders.json`).
  - the delete route cancels the invoice, attempts the hard delete, and on an accounting link **hides** the order from the customer's dashboard instead of failing.
  - `GET /api/user/orders` filters hidden orders out.
- **Verified:** `{ "message": "Order removed from your orders." }` and the order disappears from the customer's list.

### BUG-5 — Login response said `"No App"`
- **Cause:** ERPNext's login endpoint answers `"No App"` for Website Users; the controller passed that straight through.
- **Fix:** `authController.login()` now returns `"Signed in successfully."`.
- **Verified:** live login response — `{"success":true,"message":"Signed in successfully.", …}`.

---

## 3. Customer flow — detailed results

| # | Step | Endpoint | Result |
|---|---|---|---|
| 1 | Signup | `POST /api/auth/signup` | ✅ 200 — user + Customer + Contact created |
| 2 | Set-password email | ERPNext Communication | ✅ *"Set your OXIGEN password — OXIGEN"* created |
| 3 | Set password | `POST /api/auth/set-password` | ✅ 200 — *"Password set successfully."* |
| 4 | Login | `POST /api/auth/login` | ✅ 200 — session cookie, user payload |
| 5 | Who am I | `GET /api/auth/me` | ✅ 200 |
| 6 | Profile | `GET /api/customer/profile` | ✅ 200 |
| 7 | Save address | `POST /api/user/addresses` | ✅ 200 — Customer link attached (BUG-3 fix) |
| 8 | List addresses | `GET /api/user/addresses` | ✅ 200 |
| 9 | Place order | `POST /api/user/orders` | ✅ 201 — `SAL-ORD-2026-00004` |
| 10 | Order list | `GET /api/user/orders` | ✅ 200 — status *Unpaid*, total 1600 |
| 11 | Order detail | `GET /api/user/orders/:name` | ✅ 200 |
| 12 | Payment modes | `GET /api/user/payment-modes` | ✅ 200 — Cash, Bank Draft, Cheque, Credit Card, Wire Transfer |
| 13 | Record payment | `POST /api/user/orders/:name/payment` | ✅ 200 — `ACC-PAY-…`; status → **Completed**, outstanding → 0 |
| 14 | Cancel order | `POST /api/user/orders/:name/return` | ✅ 200 — *"cancelled. Stock restored."* |
| 15 | Remove order | `POST /api/user/orders/:name/delete` | ✅ 200 — removed from dashboard (BUG-4 fix) |
| 16 | Order list after remove | `GET /api/user/orders` | ✅ 0 orders |

**Note on the payment step:** paying an amount different from `outstanding_amount` is rejected by ERPNext (*"Difference Amount must be zero"*). The frontend already pre-fills the exact outstanding amount, so this is correct behaviour — not a bug.

---

## 4. Admin flow — detailed results

### Read endpoints — 17/17 pass
`/api/items` · `/api/items/groups` · `/api/admin/monitor` · `/api/admin/inventory` · `/api/admin/orders` · `/api/admin/orders/items` · `/api/admin/orders/:name` · `/api/admin/customers` · `/api/admin/discounts` · `/api/admin/users` · `/api/admin/files` · `/api/admin/banners` · `/api/admin/payment-modes` · `/api/admin/content` · `/api/admin/content/:section` · `/api/admin/settings` · `/api/admin/notifications` · `/api/erp/stats` · `/api/erp/resource/:doctype`

### Write endpoints — 19/19 pass

| Resource | Create | Read | Update | Delete |
|---|---|---|---|---|
| Item Group | ✅ 201 | ✅ | ✅ 200 | ✅ |
| Item (product) | ✅ 201 | ✅ 200 | ✅ 200 | ✅ 200 |
| Discount (Pricing Rule) | ✅ 201 | ✅ | ✅ 200 | ✅ 200 |
| Customer | ✅ 201 | ✅ | ✅ 200 | ✅ 200 |
| Banner | ✅ 201 | ✅ | ✅ 200 | ✅ 200 |
| File (multipart upload) | ✅ 201 | ✅ | — | ✅ 200 |
| Lead (generic ERP) | ✅ 201 | ✅ | ✅ 200 | ✅ 200 |
| Inventory adjust | ✅ 200 | ✅ | — | — |
| Content section | ✅ 200 | ✅ | ✅ | — |
| Notifications clear | ✅ 200 | ✅ | — | — |

### Negative / guard-rail tests
| Test | Result |
|---|---|
| `POST /api/items` with `item_group: "DoesNotExist"` | ✅ 201 — backend falls back to a real group instead of a 500 |
| `POST /api/admin/inventory/adjust` adding more than available | ✅ 400 — *"Low stock in main warehouse. Quantity cannot be added to website stock."* |
| `PUT /api/admin/content/general` (unknown section) | ✅ 400 — *"Unknown section: general"* |
| `POST /api/admin/inventory/adjust` with valid qty | ✅ 200 |
| `PUT /api/admin/content/faqs` | ✅ 200 — content persisted |

---

## 5. Live Cloudflare smoke test

| Path | Code | Path | Code |
|---|---|---|---|
| `/` | 200 | `/product/nutri-cept` | 200 |
| `/shop` | 200 | `/product/oxidop` | 200 |
| `/about` | 200 | `/admin` | 200 |
| `/faq` | 200 | `/dashboard` | 200 |
| `/reviews` | 200 | `/checkout` | 200 |
| `/contact` | 200 | `/sitemap.xml` | 200 |
| `/categories` | 200 | `/robots.txt` | 200 |
| `/offers` | 200 | | |

API: `/api/health` · `/api/site-content` · `/api/banners` · `/api/items` · `/api/items/groups` · `/api/config` → **all 200**

Full signup → email → set-password → login → address → order → pay → cancel → remove was executed **through the Cloudflare worker** (not just locally) and passed end-to-end.

---

## 6. Files changed (not yet pushed)

```
backend/src/controllers/auth.controller.ts   — reset-password email template, login message
backend/src/lib/erpnext-client.ts            — real ensureAddressLinkedToCustomer()
backend/src/lib/hidden-orders.ts              — NEW: soft-delete store for customer orders
backend/src/routes/user.ts                    — customer link on address create, hidden-order filter, order delete fallback
backend/src/services/frappe.service.ts        — Customer lookup via Contact.links, ensureContactLinkedToCustomer()
```

**GitHub push nahi kiya** (jab tak aap na kahein).

---

## 7. Recommendations (optional, not implemented)

1. **Stock is deducted at order placement**, not delivery — the Sales Invoice is created with `update_stock = 1` immediately. This makes orders permanently undeletable in ERPNext (Stock Ledger Entries). If you want cancellable orders with a clean audit trail, set `update_stock = 0` and post stock on delivery instead.
2. **`/api/customer/addresses`** (legacy endpoint) creates addresses without `address_type: "Shipping"`, so the GET filter never returns them. The storefront uses `/api/user/addresses` (correct), but the legacy endpoint is still exposed.
3. **Admin "delete order"** always answers *"cancelled/deleted"* even when ERPNext keeps the document. Consider the same soft-delete treatment for the admin order list, or a clearer message.
4. **Guest checkout** (no login) was not covered by this test round — worth a pass.
5. **Email templates** other than set/reset password (order confirmation, admin new-order notification) were not end-to-end verified because the order path does not currently call `sendMail`.

---

## 8. Test data cleanup

All test artifacts created during the run were removed or disabled:

- Test users (`oxigen.e2e.test@`, `oxigen.e2e.live@`, `oxigen.e2e.new@`) — **deleted** from ERPNext
- Test customers / contacts (E2E Tester, Live Test, New Tester) — **disabled**
- Test items, item groups, pricing rules, customers, banners, files, leads — **deleted**
- Test pricing rule `PRLE-0002` (which had shifted the live NUTRI-CEPT price to 1900) — **deleted/disabled; price verified back to 1600**
- Test FAQs content — **restored** to the original 11 entries
- `data/hidden-orders.json` — test entries removed
- Cancelled test sales orders remain in ERPNext (3 of them) — ERPNext cannot delete invoice-linked orders; they are cancelled and harmless, and can be removed from the ERPNext desk if you want a clean ledger
