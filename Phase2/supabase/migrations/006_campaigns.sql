-- ============================================================
-- Migration 006 — WhatsApp Campaigns
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS campaigns (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id      UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  segment      TEXT NOT NULL DEFAULT 'all',  -- 'all' | 'vip' | 'regular' | 'lapsed'
  message      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'sending' | 'sent' | 'failed'
  scheduled_at TIMESTAMPTZ,
  sent_at      TIMESTAMPTZ,
  sent_count   INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_campaigns_cafe ON campaigns(cafe_id, created_at DESC);
