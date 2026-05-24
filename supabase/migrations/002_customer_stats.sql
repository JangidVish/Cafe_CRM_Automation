-- ============================================================
-- Phase 3: Customer stats trigger
-- Updates total_orders, total_spent, last_visit_at on customers
-- whenever a new order is inserted.
-- Run in Supabase SQL Editor after 001_initial_schema.sql
-- ============================================================

-- Allow service role to manage customers (bypasses RLS via admin client, but explicit is safer)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'customers'
      AND policyname = 'Service role full access to customers'
  ) THEN
    CREATE POLICY "Service role full access to customers"
      ON customers FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Trigger function: recompute stats for the customer linked to the new order
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    UPDATE customers
    SET
      total_orders  = (
        SELECT COUNT(*) FROM orders
        WHERE customer_id = NEW.customer_id
          AND cafe_id = NEW.cafe_id
      ),
      total_spent   = (
        SELECT COALESCE(SUM(total_amount), 0) FROM orders
        WHERE customer_id = NEW.customer_id
          AND cafe_id = NEW.cafe_id
      ),
      last_visit_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fire after every new order
DROP TRIGGER IF EXISTS orders_update_customer_stats ON orders;
CREATE TRIGGER orders_update_customer_stats
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION update_customer_stats();
