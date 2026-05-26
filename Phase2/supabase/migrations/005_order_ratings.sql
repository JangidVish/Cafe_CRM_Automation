-- ============================================================
-- Migration 005 — Order Ratings
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS order_ratings (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id    UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rating     INT  NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(order_id)
);

ALTER TABLE order_ratings ENABLE ROW LEVEL SECURITY;

-- Public can insert (customer submits rating) and read
CREATE POLICY "Public can rate orders"
  ON order_ratings FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can read ratings"
  ON order_ratings FOR SELECT USING (true);

CREATE INDEX idx_order_ratings_cafe ON order_ratings(cafe_id, created_at DESC);
