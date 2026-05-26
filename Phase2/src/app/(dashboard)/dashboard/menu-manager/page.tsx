import { createAdminClient, getOwnerCafe } from '@/lib/supabase/server'
import type { MenuCategory } from '@/lib/types'
import NoCafeSetup from '@/components/dashboard/NoCafeSetup'
import MenuManagerClient from './MenuManagerClient'

export const metadata = { title: 'Menu Manager' }

export default async function MenuManagerPage() {
  const cafe = await getOwnerCafe()
  if (!cafe) return <NoCafeSetup />

  const supabase = createAdminClient()

  const { data: categories } = await supabase
    .from('menu_categories')
    .select('*, items:menu_items(*)')
    .eq('cafe_id', cafe.id)
    .order('sort_order', { ascending: true })

  return (
    <MenuManagerClient
      initialCategories={(categories ?? []) as MenuCategory[]}
      cafeId={cafe.id}
    />
  )
}
