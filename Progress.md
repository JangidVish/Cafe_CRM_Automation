# Cafe CRM Automation — Progress Tracker

> **Legend:** ✅ Done &nbsp;|&nbsp; 🔧 Partial / Stubbed &nbsp;|&nbsp; ⬜ Not Started
>
> Last updated: 2026-05-26

---

## Phase 2 — Core Ordering System

### 2.1 Project Setup & Infrastructure
| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Next.js 14 App Router project scaffold | ✅ | TypeScript strict, path aliases |
| 2 | Tailwind CSS with custom brand theme | ✅ | Custom colors, fonts (Playfair + DM Sans), animations |
| 3 | Supabase client + server helpers | ✅ | `src/lib/supabase/client.ts` + `server.ts` |
| 4 | TypeScript interfaces for all DB types | ✅ | `src/lib/types/index.ts` |
| 5 | Environment variables template | ✅ | `.env.local.example` with all keys documented |
| 6 | Root `/` page (redirect to login) | ✅ | Fixed 2026-05-26 — was returning 404 |
| 7 | Next.js viewport metadata fix | ✅ | Fixed 2026-05-26 — moved to `viewport` export |

### 2.2 Database Schema
| # | Task | Status | Notes |
|---|------|--------|-------|
| 8 | `cafes` table (multi-tenant root) | ✅ | Slug, settings JSONB, RLS |
| 9 | `tables` table | ✅ | QR URL, active toggle, unique (cafe, number) |
| 10 | `menu_categories` table | ✅ | Hindi name, sort_order, active |
| 11 | `menu_items` table | ✅ | Full: price, veg, spice, allergens, featured, upsell_ids |
| 12 | `customers` table | ✅ | Phone-based CRM, tags array, stats columns |
| 13 | `orders` table | ✅ | Status ENUM, payment ENUM, Razorpay fields |
| 14 | `order_items` table | ✅ | Snapshot of name+price at order time |
| 15 | Row Level Security on all tables | ✅ | Public read (active items/cafes), service role writes |
| 16 | `generate_order_number()` function | ✅ | "ORD-0042" sequential per cafe |
| 17 | `increment_order_count` trigger | ✅ | Updates `menu_items.order_count` on order insert |
| 18 | Supabase Realtime on orders + order_items | ✅ | Publication enabled, used by kitchen + tracker |
| 19 | Demo seed data (Sunrise Cafe) | ✅ | 6 tables, 5 categories, 14 items, Hindi translations |

### 2.3 Authentication & Routing
| # | Task | Status | Notes |
|---|------|--------|-------|
| 20 | Supabase Auth (email + password) | ✅ | `supabase.auth.signInWithPassword` |
| 21 | Login page UI | ✅ | `/login` — email, password, visibility toggle, error display |
| 22 | Auth middleware (route protection) | ✅ | Protects `/dashboard/*` and `/kitchen/*`, redirects with `?next=` |
| 23 | Redirect authenticated users from `/login` → `/dashboard` | ✅ | Handled in middleware |
| 24 | Sign out from dashboard | ✅ | Button in sidebar nav |
| 25 | Owner sign-up / invite flow | ✅ | `/signup` page — email+password, Supabase trigger auto-creates cafe |

### 2.4 Customer Menu (QR Flow)
| # | Task | Status | Notes |
|---|------|--------|-------|
| 26 | Menu page server render (`/menu/[tableId]`) | ✅ | Fetches cafe, table, categories, items server-side |
| 27 | MenuShell layout component | ✅ | Orchestrates header, nav, grid, cart bar |
| 28 | MenuHeader (cafe name, filters, lang toggle) | ✅ | EN ↔ HI toggle, Veg/All/Non-veg filter |
| 29 | Category sticky nav tabs | ✅ | Scroll-linked, active highlight |
| 30 | Menu item cards — rich (with image) | ✅ | Image top, price, badges, qty controls |
| 31 | Menu item cards — compact (no image) | ✅ | Inline row layout |
| 32 | Veg / Non-veg dot indicators | ✅ | Green (veg) / red (non-veg) FSSAI-style dots |
| 33 | Spice level indicator (0–3 chillies) | ✅ | Shown on item cards |
| 34 | Featured badge | ✅ | Star badge on featured items |
| 35 | Social proof (order count) | ✅ | "Ordered 247 times" on popular items |
| 36 | Hindi name + description display | ✅ | Switches on language toggle |
| 37 | Item availability toggle (real-time) | ✅ | Unavailable items shown as greyed out |

### 2.5 Cart & Checkout
| # | Task | Status | Notes |
|---|------|--------|-------|
| 38 | Cart state (Zustand + localStorage persist) | ✅ | `src/lib/hooks/useCart.ts` |
| 39 | Floating cart bar (item count) | ✅ | `CartBar.tsx` — sticky bottom |
| 40 | Cart bottom sheet slide-up | ✅ | `CartSheet.tsx` — full checkout flow |
| 41 | Add / remove / change quantity in cart | ✅ | ± buttons in item cards and cart sheet |
| 42 | Special instructions field | ✅ | Per-order customisation text |
| 43 | Customer phone capture | ✅ | Optional, used for WhatsApp + CRM |
| 44 | Payment method selector (UPI / Cash) | ✅ | Radio toggle in cart sheet |
| 45 | Order creation API (`POST /api/orders`) | ✅ | Creates order + order_items, upserts customer |
| 46 | Customer auto-upsert on order | ✅ | Phone → customer row, updates last_visit_at |
| 47 | Tax calculation (from cafe settings) | ✅ | Computed server-side, stored in order |
| 48 | Cash payment flow (skip payment, go to tracker) | ✅ | Straight redirect after order creation |
| 49 | Razorpay UPI — create order (`POST /api/payments`) | ✅ | Returns Razorpay order_id |
| 50 | Razorpay modal integration (client-side) | ✅ | Dynamically loads Razorpay script |
| 51 | Razorpay signature verification (server-side) | ✅ | HMAC-SHA256 — prevents spoofing |
| 52 | Cart clear after successful checkout | ✅ | Zustand store reset on order success |
| 53 | Discount / promo code support | ⬜ | `discount_amount` column exists in schema, no UI |
| 54 | Service charge configurable in checkout | ⬜ | Column in schema, not exposed to customer |

### 2.6 Order Tracking
| # | Task | Status | Notes |
|---|------|--------|-------|
| 55 | Order tracking page (`/order/[orderId]`) | ✅ | Server-rendered initial load |
| 56 | Real-time status updates (Supabase Realtime) | ✅ | `useKitchenOrders` hook subscribes to order updates |
| 57 | Progress bar (Pending → Confirmed → Making → Ready → Served) | ✅ | 5 steps with status-specific messages |
| 58 | Order item list on tracking page | ✅ | Items + quantities displayed |
| 59 | WhatsApp share preview bubble | 🔧 | UI bubble built; actual send requires Wati credentials |
| 60 | Back-to-menu link | ✅ | Links back to `/menu/[tableId]` |

### 2.7 Kitchen Display System (KDS)
| # | Task | Status | Notes |
|---|------|--------|-------|
| 61 | Kitchen display page (`/kitchen`) | ✅ | Tablet-optimised layout |
| 62 | Real-time Kanban (4 columns: Pending / Confirmed / Making / Ready) | ✅ | `KitchenDisplay.tsx` |
| 63 | Supabase Realtime subscription for kitchen | ✅ | `useKitchenOrders` hook |
| 64 | Per-order timer (color-coded: green / amber / red) | ✅ | <10m green, 10–20m amber, >20m red |
| 65 | One-tap status advancement button per order | ✅ | Accept → Start → Ready |
| 66 | Special notes highlighted in amber | ✅ | Shown inside order card |
| 67 | Live indicator (blinking green dot) | ✅ | Shows Realtime is connected |
| 68 | Kitchen auth (per-cafe login, not hardcoded) | ✅ | Kitchen page now uses `getOwnerCafe()` — each owner sees only their own kitchen |
| 69 | Per-item status tracking in KDS | ⬜ | `order_items.status` column exists, no UI for it |

### 2.8 Owner Dashboard
| # | Task | Status | Notes |
|---|------|--------|-------|
| 70 | Dashboard layout + sidebar nav | ✅ | `(dashboard)/layout.tsx` |
| 71 | Hardcoded DEMO_CAFE_ID → auth-based cafe lookup | ✅ | `getOwnerCafe()` helper + migration 003 adds `owner_id` to cafes table |
| 72 | **Overview page** — today's metrics (orders, revenue, active, AOV) | ✅ | Server-rendered |
| 73 | **Overview page** — top 5 items today | ✅ | |
| 74 | **Orders page** — date picker filter | ✅ | Last 7 days |
| 75 | **Orders page** — status filter pills | ✅ | All / pending / confirmed / making / ready / served / completed / cancelled |
| 76 | **Orders page** — advance order status | ✅ | Button per row |
| 77 | **Orders page** — revenue total counter | ✅ | |
| 78 | **Menu Manager** — category CRUD (add / edit / delete) | ✅ | Modal UI |
| 79 | **Menu Manager** — item CRUD (add / edit / delete) | ✅ | Drawer UI |
| 80 | **Menu Manager** — item availability toggle | ✅ | Eye icon per item |
| 81 | **Menu Manager** — image upload for items | ✅ | Upload UI in ItemDrawer, `menu-images` bucket in migration 003, cafeId prop wired |
| 82 | **Analytics** — 7-day revenue bar chart | ✅ | Pure CSS bars |
| 83 | **Analytics** — top 8 items horizontal bars | ✅ | |
| 84 | **Analytics** — hourly distribution (today) | ✅ | 7am–8pm histogram |
| 85 | **Analytics** — date range picker (beyond 7 days) | ⬜ | Fixed 7-day window only |
| 86 | **Customers** — list with search + tag filter | ✅ | `CustomersClient.tsx` |
| 87 | **Customers** — inline name edit | ✅ | Click to edit, check/X to save |
| 88 | **Customers** — tag toggle (VIP / Regular / Lapsed) | ✅ | One-click toggle |
| 89 | **Customers** — order history expand row | ✅ | |
| 90 | **Tables** — add table form | ✅ | Number, label, capacity |
| 91 | **Tables** — QR code generation | ✅ | Generates data URLs via `qrcode` library |
| 92 | **Tables** — download QR as PNG | ✅ | Per-table download |
| 93 | **Tables** — print all QRs | ✅ | Print styles hide non-QR content |

### 2.9 WhatsApp Integration (Wati)
| # | Task | Status | Notes |
|---|------|--------|-------|
| 94 | WhatsApp utility functions (`whatsapp.ts`) | ✅ | `sendOrderConfirmation`, `sendOwnerAlert` |
| 95 | WhatsApp wired to order creation API | ✅ | Called in `POST /api/orders` |
| 96 | WhatsApp graceful fallback if unconfigured | ✅ | Logs warning, never blocks order |
| 97 | Wati account + API credentials setup | ⬜ | Needs `WATI_API_ENDPOINT` + `WATI_ACCESS_TOKEN` |
| 98 | WhatsApp message template approval (Meta) | ⬜ | Required for proactive messages outside 24h window |
| 99 | End-to-end WhatsApp test with real number | ⬜ | |
| 100 | Owner alert WhatsApp (`sendOwnerAlert`) | 🔧 | Code written, wired — pending credentials |

---

## Phase 3 — CRM & Automation

### 3.1 Customer Data Foundation
| # | Task | Status | Notes |
|---|------|--------|-------|
| 101 | Customer schema + RLS | ✅ | In `001_initial_schema.sql` |
| 102 | Customer auto-upsert on every order | ✅ | Phone-keyed, handled in `POST /api/orders` |
| 103 | Customer stats DB trigger | ✅ | `002_customer_stats.sql` — auto-updates `total_orders`, `total_spent`, `last_visit_at` |
| 104 | Run `002_customer_stats.sql` in production | ⬜ | Migration written but needs to be executed on live DB |

### 3.2 Customer Segmentation
| # | Task | Status | Notes |
|---|------|--------|-------|
| 105 | Manual tag toggle UI (VIP / Regular / Lapsed) | ✅ | Built in Customers dashboard |
| 106 | Auto-tagging rules engine | ✅ | `auto_tag_customers()` SQL function + "Auto-tag" button. Run `004_auto_tagging.sql` |
| 107 | Scheduled job to re-evaluate tags | ⬜ | Supabase Edge Function or cron |
| 108 | Customer LTV tier badge (Bronze/Silver/Gold/Platinum) | ✅ | Pure UI, computed from `total_spent` in `CustomersClient.tsx` |
| 109 | Customer export to CSV | ✅ | `GET /api/customers/export` — browser download with all fields |

### 3.3 WhatsApp Campaign Automation
| # | Task | Status | Notes |
|---|------|--------|-------|
| 110 | Campaign builder UI | ✅ | `/dashboard/campaigns` — drawer form, segment selector, WhatsApp preview |
| 111 | Campaign send to segment | ✅ | `POST /api/campaigns/[id]/send` — personalises `{name}`, tracks sent/failed counts |
| 112 | Campaign segment counts | ✅ | Live count shown in drawer for All/VIP/Regular/Lapsed |
| 113 | Campaign history list | ✅ | Shows status, sent count, date |
| 114 | `sendWhatsApp` generic utility | ✅ | Added to `whatsapp.ts` for campaigns + low-rating alerts |
| 115 | Birthday / anniversary greetings | ⬜ | Requires DOB field on customer (not in schema yet) |
| 116 | Campaign delivery analytics (Wati webhooks) | ⬜ | Wati webhook for status callbacks |

### 3.4 Loyalty System
| # | Task | Status | Notes |
|---|------|--------|-------|
| 117 | Loyalty points schema | ✅ | `loyalty_config` + `customer_points` tables — `007_loyalty_points.sql` |
| 118 | Points earn on order completion | ✅ | Auto-calculated in `PATCH /api/orders` when status → `completed` |
| 119 | Points redeem at checkout | ✅ | CartSheet fetches balance, shows toggle if ≥ min threshold |
| 120 | Points balance on order tracker | ✅ | Shows "+X points earned!" on completed orders |
| 121 | Points balance in owner dashboard | ✅ | Column in Customers table, loyalty config at `/dashboard/loyalty` |
| 122 | Loyalty settings page | ✅ | `/dashboard/loyalty` — earn rate, redeem rate, min points, enable toggle |

### 3.5 Feedback & Reviews
| # | Task | Status | Notes |
|---|------|--------|-------|
| 123 | Post-order rating page (`/rate/[orderId]`) | ✅ | Public page — 1–5 stars, optional comment, "already rated" guard |
| 124 | Ratings stored in DB | ✅ | `order_ratings` table — `005_order_ratings.sql` |
| 125 | Rating summary in analytics | ✅ | 4th summary card "Avg rating" + recent reviews section |
| 126 | Bad rating alert to owner (WhatsApp) | ✅ | Fires in `POST /api/ratings` if rating ≤ 2 |
| 127 | "Rate your order" button on tracker | ✅ | Shown when order status is `served` or `completed` |

### 3.6 Prisma ORM Integration
| # | Task | Status | Notes |
|---|------|--------|-------|
| 128 | Prisma schema (`prisma/schema.prisma`) | ✅ | Full schema — all Phase 1/2/3 tables + Phase 3 models |
| 129 | Prisma seed (`prisma/seed.ts`) | ✅ | TypeScript seed — Sunrise Cafe, 10 items, 3 customers, loyalty config |
| 130 | Prisma singleton client (`src/lib/prisma.ts`) | ✅ | Dev singleton pattern |
| 131 | Prisma scripts in `package.json` | ✅ | `db:push`, `db:studio`, `db:seed`, `db:generate` |
| 132 | Prisma v5 (downgraded from v7 incompatible) | ✅ | v7 requires adapter pattern — v5 stable with schema url |

---

## Phase 4 — Intelligence & Growth

### 4.1 AI-Powered Features
| # | Task | Status | Notes |
|---|------|--------|-------|
| 126 | Upsell recommendations (schema-ready) | ⬜ | `upsell_item_ids` column exists — needs ML or rule-based logic + UI |
| 127 | Weather-based menu suggestions | ⬜ | `OPENWEATHER_API_KEY` placeholder in `.env.local.example` |
| 128 | Demand forecasting (predict busy hours) | ⬜ | Based on historical `orders` data |
| 129 | AI-generated menu descriptions | ⬜ | Claude API to enhance item descriptions |
| 130 | Smart combo suggestions at checkout | ⬜ | "Customers also ordered…" based on order history |

### 4.2 Advanced Reporting
| # | Task | Status | Notes |
|---|------|--------|-------|
| 131 | Analytics date range picker (30 / 90 days) | ⬜ | Currently hard-capped at 7 days |
| 132 | Monthly / quarterly revenue reports | ⬜ | PDF or CSV export |
| 133 | Category-level revenue breakdown | ⬜ | Pie / donut chart |
| 134 | Staff performance metrics | ⬜ | Orders served per shift |
| 135 | Inventory tracking (items sold vs stock) | ⬜ | New `inventory` table required |

### 4.3 Multi-Cafe & Staff Management
| # | Task | Status | Notes |
|---|------|--------|-------|
| 136 | Owner → cafe mapping table | ✅ | `getOwnerCafe()` via `owner_id` on cafes table — replaces all DEMO_CAFE_ID usage |
| 137 | Multi-location support (same owner, multiple cafes) | ⬜ | Selector in dashboard header |
| 138 | Staff roles (owner / manager / kitchen / waiter) | ⬜ | `cafe_staff` table with role ENUM |
| 139 | Role-based access control | ⬜ | Kitchen staff sees KDS only, manager sees orders + analytics |
| 140 | Staff invite system | ⬜ | Email invite → Supabase Auth sign-up |

### 4.4 Customer-Facing Enhancements
| # | Task | Status | Notes |
|---|------|--------|-------|
| 141 | Progressive Web App (PWA) | ⬜ | Installable on customer phones, offline menu cache |
| 142 | Order history for returning customers | ⬜ | Phone OTP → see past orders |
| 143 | Reorder from previous order | ⬜ | One-tap re-add last order to cart |
| 144 | Pre-order / scheduled orders | ⬜ | "Ready at 1pm" flow |
| 145 | Table-side bill request | ⬜ | Customer taps "Request bill" → notifies waiter |

### 4.5 Integrations & DevOps
| # | Task | Status | Notes |
|---|------|--------|-------|
| 146 | Vercel deployment + env setup | ⬜ | Config ready, needs deployment |
| 147 | Custom domain setup | ⬜ | Per-cafe subdomains (sunrise.yourdomain.com) |
| 148 | Supabase CLI migrations workflow | ⬜ | `supabase db push` for safe schema updates |
| 149 | Error monitoring (Sentry) | ⬜ | Uncaught API + client errors |
| 150 | Uptime monitoring | ⬜ | Alert if ordering system goes down |

---

## Summary

| Phase | Total Tasks | Done | Partial | Remaining |
|-------|------------|------|---------|-----------|
| Phase 2 | 100 | 83 | 4 | 13 |
| Phase 3 | 25 | 4 | 0 | 21 |
| Phase 4 | 25 | 0 | 0 | 25 |
| **Total** | **150** | **87** | **4** | **59** |

---

## Immediate Next Steps (Phase 2 Remaining)

Tasks still needed before Phase 2 is production-ready:

1. **Run migration 003** — `supabase/migrations/003_owner_cafe_mapping.sql` must be executed in your Supabase SQL Editor, then `UPDATE cafes SET owner_id = '<uuid>' WHERE slug = 'sunrise-cafe'` to link the demo cafe
2. **#97–99** — Wati account setup + WhatsApp template approval + live test (skipped by user)
3. **#85** — Analytics date range picker (currently fixed 7-day window)
4. **#53** — Discount / promo code UI
5. **#54** — Service charge configurable in checkout
6. **#69** — Per-item status tracking in kitchen display
