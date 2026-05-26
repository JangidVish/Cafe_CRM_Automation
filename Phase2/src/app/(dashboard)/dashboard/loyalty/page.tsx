import { createAdminClient, getOwnerCafe } from '@/lib/supabase/server'
import NoCafeSetup from '@/components/dashboard/NoCafeSetup'
import LoyaltyClient from './LoyaltyClient'

export const metadata = { title: 'Loyalty Points' }

export default async function LoyaltyPage() {
  const cafe = await getOwnerCafe()
  if (!cafe) return <NoCafeSetup />

  const supabase = createAdminClient()

  const [{ data: config }, { data: stats }] = await Promise.all([
    supabase
      .from('loyalty_config')
      .select('*')
      .eq('cafe_id', cafe.id)
      .single(),
    supabase
      .from('customers')
      .select('points_balance')
      .eq('cafe_id', cafe.id)
      .gt('points_balance', 0),
  ])

  const customers = stats ?? []
  const totalPointsIssued = customers.reduce((s: number, c: any) => s + (c.points_balance ?? 0), 0)
  const customersWithPoints = customers.length

  return (
    <LoyaltyClient
      initialConfig={config}
      totalPointsIssued={totalPointsIssued}
      customersWithPoints={customersWithPoints}
    />
  )
}
