import { createAdminClient, getOwnerCafe } from '@/lib/supabase/server'
import NoCafeSetup from '@/components/dashboard/NoCafeSetup'
import CampaignClient from './CampaignClient'

export const metadata = { title: 'Campaigns' }

export default async function CampaignsPage() {
  const cafe = await getOwnerCafe()
  if (!cafe) return <NoCafeSetup />

  const supabase = createAdminClient()

  const [{ data: campaigns }, { count: totalCustomers }] = await Promise.all([
    supabase
      .from('campaigns')
      .select('*')
      .eq('cafe_id', cafe.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('cafe_id', cafe.id),
  ])

  // Segment counts
  const { data: segmentData } = await supabase
    .from('customers')
    .select('tags')
    .eq('cafe_id', cafe.id)

  const customers = segmentData ?? []
  const segmentCounts = {
    all:     customers.length,
    vip:     customers.filter(c => c.tags?.includes('vip')).length,
    regular: customers.filter(c => c.tags?.includes('regular')).length,
    lapsed:  customers.filter(c => c.tags?.includes('lapsed')).length,
  }

  return (
    <CampaignClient
      initialCampaigns={campaigns ?? []}
      cafeId={cafe.id}
      segmentCounts={segmentCounts}
    />
  )
}
