import { getOwnerCafe } from '@/lib/supabase/server'
import KitchenDisplay from '@/components/kitchen/KitchenDisplay'
import NoCafeSetup from '@/components/dashboard/NoCafeSetup'

export const metadata = { title: 'Kitchen Display' }

export default async function KitchenPage() {
  const cafe = await getOwnerCafe()
  if (!cafe) return <NoCafeSetup />
  return <KitchenDisplay cafeId={cafe.id} />
}
