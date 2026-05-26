-- ============================================================
-- Migration 004 — Auto-tagging Engine
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION auto_tag_customers(p_cafe_id UUID)
RETURNS INT AS $$
BEGIN
  UPDATE customers
  SET tags = (
    -- Keep non-standard tags, recompute vip / regular / lapsed
    ARRAY(
      SELECT UNNEST(tags)
      EXCEPT SELECT UNNEST(ARRAY['vip','regular','lapsed']::TEXT[])
    )
    ||
    ARRAY(
      SELECT t FROM (VALUES (
        CASE
          WHEN total_spent >= 5000 OR total_orders >= 20 THEN 'vip'
          WHEN last_visit_at < NOW() - INTERVAL '30 days'
               AND total_orders > 0                      THEN 'lapsed'
          WHEN total_orders >= 3                         THEN 'regular'
          ELSE NULL
        END
      )) AS sub(t) WHERE t IS NOT NULL
    )
  )
  WHERE cafe_id = p_cafe_id;

  RETURN (SELECT COUNT(*)::INT FROM customers WHERE cafe_id = p_cafe_id);
END;
$$ LANGUAGE plpgsql;
