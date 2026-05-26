-- ============================================================
-- Phase 2: Owner → Cafe mapping + Storage bucket
-- Run AFTER 001_initial_schema.sql in Supabase SQL Editor
-- ============================================================

-- ─── 1. LINK CAFES TO AUTH USERS ────────────────────────────
ALTER TABLE cafes ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cafes_owner_id ON cafes(owner_id);

-- Owner RLS policies
CREATE POLICY "Owner can read own cafe"
  ON cafes FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Owner can update own cafe"
  ON cafes FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- ─── 2. AUTO-CREATE CAFE ON SIGN-UP ─────────────────────────
-- When a new user signs up, automatically create a placeholder cafe for them.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_slug  TEXT;
  final_slug TEXT;
  counter    INT := 0;
BEGIN
  base_slug  := 'cafe-' || REPLACE(SUBSTR(NEW.id::TEXT, 1, 8), '-', '');
  final_slug := base_slug;

  WHILE EXISTS (SELECT 1 FROM public.cafes WHERE slug = final_slug) LOOP
    counter    := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  INSERT INTO public.cafes (owner_id, name, slug, is_active)
  VALUES (NEW.id, 'My Cafe', final_slug, false);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 3. STORAGE: menu-images bucket ─────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read menu images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-images');

CREATE POLICY "Authenticated upload menu images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'menu-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated update menu images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'menu-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated delete menu images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'menu-images' AND auth.uid() IS NOT NULL);

-- ─── 4. LINK EXISTING DEMO CAFE ─────────────────────────────
-- IMPORTANT: After running this migration, link your existing cafe to your account.
-- Run this in Supabase SQL Editor (replace the UUID with your actual user ID):
--
--   UPDATE cafes
--   SET owner_id = 'YOUR-AUTH-USER-UUID-HERE'
--   WHERE slug = 'sunrise-cafe';
--
-- Find your UUID: Supabase Dashboard → Authentication → Users → copy the UUID
