# Pending Database Actions

> Run these in Supabase SQL Editor **before** continuing development.
> Dashboard and kitchen will show "No cafe linked" until Step 3 is done.

---

## Step 1 — Run Migration 002 (Customer Stats Trigger)

File: `Phase2/supabase/migrations/002_customer_stats.sql`

Copy the contents of this file and run it in **Supabase Dashboard → SQL Editor**.

What it does: Creates a trigger that auto-updates `total_orders`, `total_spent`, and `last_visit_at`
on the `customers` table every time a new order is inserted.

---

## Step 2 — Run Migration 003 (Owner Mapping + Storage)

File: `Phase2/supabase/migrations/003_owner_cafe_mapping.sql`

Copy the contents of this file and run it in **Supabase Dashboard → SQL Editor**.

What it does:
- Adds `owner_id` column to the `cafes` table
- Creates a trigger: new sign-ups automatically get a blank cafe created
- Creates `menu-images` Supabase Storage bucket with public read + auth write
- Adds RLS policies for owners to read/update their own cafe

---

## Step 3 — Link Your Existing Cafe to Your Account

After running Migration 003, you need to manually link the Sunrise Cafe demo to your user account.

**Find your User UUID:**
Supabase Dashboard → Authentication → Users → copy the UUID next to your email

**Run this query** (replace the UUID):
```sql
UPDATE cafes
SET owner_id = 'YOUR-AUTH-USER-UUID-HERE'
WHERE slug = 'sunrise-cafe';
```

**Verify it worked:**
```sql
SELECT id, name, slug, owner_id FROM cafes WHERE slug = 'sunrise-cafe';
```
`owner_id` should now match your user UUID.

---

## After These Steps

- `http://localhost:3000/dashboard` → shows real data for Sunrise Cafe
- `http://localhost:3000/kitchen` → shows only Sunrise Cafe's kitchen
- Menu item images can be uploaded via Menu Manager
- New owner signups at `/signup` automatically get a cafe created

---

## Optional — Disable Email Confirmation (Dev Only)

If you want sign-ups to log in immediately without email confirmation:

Supabase Dashboard → Authentication → Email → **Disable "Confirm email"**

This is recommended for development. Re-enable before going live.
