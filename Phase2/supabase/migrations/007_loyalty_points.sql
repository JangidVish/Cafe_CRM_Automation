-- ============================================================
-- Migration 007 — Loyalty Points System
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- Earn/redeem config per cafe
CREATE TABLE IF NOT EXISTS loyalty_config (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id              UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE UNIQUE,
  points_per_rupee     NUMERIC(5,2) NOT NULL DEFAULT 0.1,
  rupees_per_point     NUMERIC(5,2) NOT NULL DEFAULT 0.5,
  min_points_to_redeem INT    NOT NULL DEFAULT 50,
  is_enabled           BOOLEAN NOT NULL DEFAULT true
);

-- Append-only points ledger
CREATE TABLE IF NOT EXISTS customer_points (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id     UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id    UUID REFERENCES orders(id),
  type        TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'adjust')),
  points      INT  NOT NULL,
  balance     INT  NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Denormalised balance on customers row (fast reads)
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS points_balance INT NOT NULL DEFAULT 0;

-- Points earned/redeemed per order
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS points_earned   INT NOT NULL DEFAULT 0;
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS points_redeemed INT NOT NULL DEFAULT 0;

ALTER TABLE loyalty_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read loyalty config"
  ON loyalty_config FOR SELECT USING (true);

CREATE POLICY "Public can read own points"
  ON customer_points FOR SELECT USING (true);

CREATE INDEX idx_customer_points_customer ON customer_points(customer_id, created_at DESC);
CREATE INDEX idx_customer_points_cafe     ON customer_points(cafe_id, created_at DESC);
