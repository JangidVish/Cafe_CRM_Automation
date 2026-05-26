# Phase 3 — CRM & Automation: Implementation Plan

> **Goal:** Turn raw customer data into automated retention, loyalty, and feedback loops.
> Phase 3 builds entirely on top of the customer data foundation from Phase 2.

---

## What's Already Done (Foundation)

| Already Built | Location |
|---|---|
| `customers` table with phone, name, tags, total_orders, total_spent, last_visit_at | `001_initial_schema.sql` |
| Customer auto-upsert on every order | `src/app/api/orders/route.ts` |
| Customer stats DB trigger (total_orders, total_spent, last_visit_at auto-updated) | `002_customer_stats.sql` |
| Customer list UI with search, tag filter, inline name edit, order history expand | `src/app/(dashboard)/dashboard/customers/` |
| Manual tag toggle (VIP / Regular / Lapsed) | `CustomersClient.tsx` |
| WhatsApp send utility (Wati API, fire-and-forget) | `src/lib/utils/whatsapp.ts` |
| WhatsApp order confirmation + owner alert (wired, needs credentials) | `src/app/api/orders/route.ts` |

---

## Phase 3 Feature Breakdown

### Feature A — Auto-Tagging Engine
**What it does:** Automatically assigns/updates VIP, Regular, Lapsed tags based on spend and recency rules. Removes the manual work from the owner.

**Rules (configurable later):**
- **VIP** → `total_spent >= ₹5,000` OR `total_orders >= 20`
- **Lapsed** → `last_visit_at < 30 days ago` AND `total_orders > 0`
- **Regular** → `total_orders >= 3` (and not VIP or Lapsed)

**Implementation:**

*New migration: `004_auto_tagging.sql`*
```sql
CREATE OR REPLACE FUNCTION auto_tag_customers(p_cafe_id UUID)
RETURNS INT AS $$
BEGIN
  UPDATE customers
  SET tags = (
    -- Keep non-standard tags (future custom tags), recompute standard ones
    ARRAY(SELECT UNNEST(tags)
          EXCEPT SELECT UNNEST(ARRAY['vip','regular','lapsed']))
    ||
    ARRAY(SELECT t FROM (VALUES (
      CASE
        WHEN total_spent >= 5000 OR total_orders >= 20 THEN 'vip'
        WHEN last_visit_at < NOW() - INTERVAL '30 days'
             AND total_orders > 0                      THEN 'lapsed'
        WHEN total_orders >= 3                         THEN 'regular'
        ELSE NULL
      END
    )) AS sub(t) WHERE t IS NOT NULL)
  )
  WHERE cafe_id = p_cafe_id;

  RETURN (SELECT COUNT(*) FROM customers WHERE cafe_id = p_cafe_id);
END;
$$ LANGUAGE plpgsql;
```

*New API route: `POST /api/customers/auto-tag`*
- Calls `auto_tag_customers(cafe_id)`
- Returns count of customers updated

*UI change: `CustomersClient.tsx`*
- Add "Auto-tag" button in the Customers page header
- Shows toast: "237 customers tagged"

*Files to create/modify:*
- `supabase/migrations/004_auto_tagging.sql` (new)
- `src/app/api/customers/route.ts` (add action: 'auto-tag')
- `src/app/(dashboard)/dashboard/customers/CustomersClient.tsx` (add button)

**Effort:** Small (1–2 hours)

---

### Feature B — Customer LTV Tier Badge
**What it does:** Adds a visual tier badge (Bronze/Silver/Gold/Platinum) next to each customer based on total spend. Makes VIP identification instant.

**Tiers:**
- Bronze → `₹0–999`
- Silver → `₹1,000–4,999`
- Gold → `₹5,000–19,999`
- Platinum → `₹20,000+`

**Implementation:**
- Pure UI change — no DB migration needed, `total_spent` already exists
- Add tier badge column to the customers table in `CustomersClient.tsx`
- Compute tier client-side from `customer.total_spent`

*Files to modify:*
- `src/app/(dashboard)/dashboard/customers/CustomersClient.tsx`

**Effort:** Tiny (30 minutes)

---

### Feature C — Customer CSV Export
**What it does:** "Download CSV" button on the Customers page that exports all customer data for external use (email tools, backup, etc.)

**Export columns:** Name, Phone, Total Orders, Total Spent, Last Visit, Tags, Joined Date

**Implementation:**

*New API route: `GET /api/customers/export`*
- Queries all customers for the cafe
- Returns `Content-Type: text/csv` with proper filename header

*UI change: Customers page header*
- "Export CSV" button → hits `/api/customers/export` → browser downloads file

*Files to create/modify:*
- `src/app/api/customers/export/route.ts` (new)
- `src/app/(dashboard)/dashboard/customers/CustomersClient.tsx` (add button)

**Effort:** Small (1 hour)

---

### Feature D — Post-Order Ratings
**What it does:** After an order is served, the customer sees a "Rate your experience" button on the order tracker. 1–5 stars + optional comment. Owner sees average rating in analytics. Low ratings trigger a WhatsApp alert.

**Implementation:**

*New migration: `005_order_ratings.sql`*
```sql
CREATE TABLE order_ratings (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id    UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rating     INT  NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(order_id)   -- one rating per order
);
```

*New page: `/rate/[orderId]`*
- Public page (no auth needed)
- Shows 5 stars + optional comment textarea
- Submits to `POST /api/ratings`
- Shows "Thank you!" after submit
- Locked if already rated (unique constraint)

*OrderTracker change (`OrderTracker.tsx`):*
- When `order.status === 'served'` or `'completed'`: show "Rate your order →" button linking to `/rate/[orderId]`

*New API route: `/api/ratings`*
- `POST`: Save rating, check uniqueness, fire WhatsApp alert if rating ≤ 2
- `GET`: Fetch rating stats for a cafe (avg, count, recent)

*Analytics change (`analytics/page.tsx`):*
- Add 4th summary card: "Avg rating" (e.g. ★ 4.3 / 5)
- Add recent reviews section

*Files to create/modify:*
- `supabase/migrations/005_order_ratings.sql` (new)
- `src/app/rate/[orderId]/page.tsx` (new)
- `src/app/rate/[orderId]/RatingForm.tsx` (new)
- `src/app/api/ratings/route.ts` (new)
- `src/app/order/[orderId]/OrderTracker.tsx` (add rate button)
- `src/app/(dashboard)/dashboard/analytics/page.tsx` (add rating card + reviews)

**Effort:** Medium (3–4 hours)

---

### Feature E — WhatsApp Campaign Automation
**What it does:** Owner creates a WhatsApp message campaign targeted at a customer segment (All / VIP / Regular / Lapsed), previews it, and sends or schedules it. Requires Wati account to be set up.

**Implementation:**

*New migration: `006_campaigns.sql`*
```sql
CREATE TABLE campaigns (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id      UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  segment      TEXT NOT NULL DEFAULT 'all', -- 'all','vip','regular','lapsed'
  message      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft',
  -- 'draft' | 'sending' | 'sent' | 'failed'
  scheduled_at TIMESTAMPTZ,
  sent_at      TIMESTAMPTZ,
  sent_count   INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

*New dashboard page: `/dashboard/campaigns`*
- List of past campaigns with status + sent/failed counts
- "New Campaign" button → opens drawer

*Campaign drawer/form:*
- Campaign name
- Segment selector: All customers / VIP / Regular / Lapsed + live count preview
- Message editor (WhatsApp markdown: `*bold*`, `_italic_`)
- Message preview bubble (uses `WhatsAppPreview` component already built)
- "Send now" button

*New API routes:*
- `GET /api/campaigns` — list campaigns for cafe
- `POST /api/campaigns` — create campaign
- `POST /api/campaigns/[id]/send` — fetch matching customers, send to all via Wati, update stats

*New nav item:* Add "Campaigns" to the dashboard sidebar

*Files to create/modify:*
- `supabase/migrations/006_campaigns.sql` (new)
- `src/app/(dashboard)/dashboard/campaigns/page.tsx` (new)
- `src/app/(dashboard)/dashboard/campaigns/CampaignClient.tsx` (new)
- `src/app/(dashboard)/dashboard/campaigns/CampaignDrawer.tsx` (new)
- `src/app/api/campaigns/route.ts` (new)
- `src/app/api/campaigns/[id]/send/route.ts` (new)
- `src/app/(dashboard)/dashboard/layout.tsx` (add nav item)

**Effort:** Large (6–8 hours). Requires Wati credentials to test end-to-end.

---

### Feature F — Loyalty Points System
**What it does:** Customers earn points on every order (e.g. 1 point per ₹10). They can redeem points at checkout for a discount. Owner configures the earn/redeem ratio from a settings page.

**Implementation:**

*New migration: `007_loyalty_points.sql`*
```sql
-- Owner configures earn/redeem rates per cafe
CREATE TABLE loyalty_config (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id              UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE UNIQUE,
  points_per_rupee     NUMERIC NOT NULL DEFAULT 0.1,  -- 0.1 = 1 pt per ₹10
  rupees_per_point     NUMERIC NOT NULL DEFAULT 0.5,  -- ₹0.50 off per point
  min_points_to_redeem INT    NOT NULL DEFAULT 50,
  is_enabled           BOOLEAN NOT NULL DEFAULT true
);

-- Append-only ledger for all point transactions
CREATE TABLE customer_points (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id     UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id    UUID REFERENCES orders(id),
  type        TEXT NOT NULL, -- 'earn' | 'redeem' | 'adjust'
  points      INT  NOT NULL, -- positive = earn, negative = redeem
  balance     INT  NOT NULL, -- running balance after this transaction
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Track balance on customer row (denormalized for fast reads)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS points_balance INT NOT NULL DEFAULT 0;

-- Track per-order earned/redeemed
ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_earned   INT NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_redeemed INT NOT NULL DEFAULT 0;
```

*Earn points trigger:*
- Fires when order status changes to `'completed'`
- Computes points = `total_amount * points_per_rupee`
- Inserts into `customer_points` ledger, updates `customers.points_balance`

*CartSheet changes:*
- After phone number is entered, fetch customer's points balance via API
- If balance ≥ `min_points_to_redeem`, show toggle: "Use 50 points (₹25 off)"
- If toggled, apply `points_redeemed` to order payload

*OrderTracker changes:*
- When order reaches `'completed'`: show "You earned X points! Balance: Y pts"

*New dashboard page: `/dashboard/loyalty`*
- Enable/disable loyalty toggle
- Configure earn rate (points per ₹10)
- Configure redeem rate (₹ value per point)
- Minimum points to redeem

*Customer table enhancement:*
- Add "Points" column to `CustomersClient.tsx`

*Files to create/modify:*
- `supabase/migrations/007_loyalty_points.sql` (new)
- `src/app/api/loyalty/route.ts` (new — config CRUD + points lookup)
- `src/app/(dashboard)/dashboard/loyalty/page.tsx` (new)
- `src/app/(dashboard)/dashboard/loyalty/LoyaltyClient.tsx` (new)
- `src/components/menu/CartSheet.tsx` (add points redeem toggle)
- `src/app/order/[orderId]/OrderTracker.tsx` (add points earned display)
- `src/app/(dashboard)/dashboard/customers/CustomersClient.tsx` (add points column)
- `src/app/(dashboard)/dashboard/layout.tsx` (add nav item)

**Effort:** Extra Large (10–12 hours). Most complex feature in Phase 3.

---

## Implementation Order

Build in this sequence — each step depends on the one before it:

```
Phase 2 DB setup (TODO_DB_SETUP.md) ← must do first
        │
        ▼
[A] Auto-tagging engine          ← 1–2 hrs  (quick win, uses existing data)
        │
        ▼
[B] LTV tier badge               ← 30 min   (pure UI, no DB)
        │
        ▼
[C] Customer CSV export          ← 1 hr     (standalone, no dependencies)
        │
        ▼
[D] Post-order ratings           ← 3–4 hrs  (new table + page + analytics)
        │
        ▼
[E] WhatsApp campaigns           ← 6–8 hrs  (needs Wati credentials)
        │
        ▼
[F] Loyalty points               ← 10–12 hrs (new schema + CartSheet + tracker)
```

**Total estimated dev time:** ~23–29 hours of focused work

---

## New Files Summary

| File | Type | Feature |
|---|---|---|
| `supabase/migrations/004_auto_tagging.sql` | Migration | A |
| `supabase/migrations/005_order_ratings.sql` | Migration | D |
| `supabase/migrations/006_campaigns.sql` | Migration | E |
| `supabase/migrations/007_loyalty_points.sql` | Migration | F |
| `src/app/api/customers/export/route.ts` | API | C |
| `src/app/api/ratings/route.ts` | API | D |
| `src/app/api/campaigns/route.ts` | API | E |
| `src/app/api/campaigns/[id]/send/route.ts` | API | E |
| `src/app/api/loyalty/route.ts` | API | F |
| `src/app/rate/[orderId]/page.tsx` | Page | D |
| `src/app/rate/[orderId]/RatingForm.tsx` | Component | D |
| `src/app/(dashboard)/dashboard/campaigns/page.tsx` | Page | E |
| `src/app/(dashboard)/dashboard/campaigns/CampaignClient.tsx` | Component | E |
| `src/app/(dashboard)/dashboard/campaigns/CampaignDrawer.tsx` | Component | E |
| `src/app/(dashboard)/dashboard/loyalty/page.tsx` | Page | F |
| `src/app/(dashboard)/dashboard/loyalty/LoyaltyClient.tsx` | Component | F |

---

## Modified Files Summary

| File | Change | Feature |
|---|---|---|
| `src/app/api/customers/route.ts` | Add auto-tag action | A |
| `src/app/(dashboard)/dashboard/customers/CustomersClient.tsx` | Auto-tag btn, LTV badge, points col | A, B, F |
| `src/app/(dashboard)/dashboard/analytics/page.tsx` | Avg rating card + recent reviews | D |
| `src/app/order/[orderId]/OrderTracker.tsx` | Rate button, points earned display | D, F |
| `src/components/menu/CartSheet.tsx` | Points redeem toggle | F |
| `src/app/(dashboard)/dashboard/layout.tsx` | Add Campaigns + Loyalty nav items | E, F |
| `src/lib/types/index.ts` | Add OrderRating, Campaign, LoyaltyConfig, CustomerPoints types | All |

---

## Prerequisites Before Starting

1. Complete `TODO_DB_SETUP.md` (run migrations 002 + 003, link demo cafe)
2. Verify dashboard loads real data at `http://localhost:3000/dashboard`
3. For Feature E (campaigns) — complete Wati WhatsApp setup first (task #97–99)
