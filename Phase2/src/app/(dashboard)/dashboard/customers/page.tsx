import { createAdminClient, getOwnerCafe } from '@/lib/supabase/server'
import type { Customer } from '@/lib/types'
import NoCafeSetup from '@/components/dashboard/NoCafeSetup'
import CustomersClient from './CustomersClient'

export default async function CustomersPage() {
  const cafe = await getOwnerCafe()
  if (!cafe) return <NoCafeSetup />

  const supabase = createAdminClient()

  const { data: cafeRow } = await supabase
    .from('cafes')
    .select('settings')
    .eq('id', cafe.id)
    .single()

  const s = (cafeRow?.settings as any)?.ltv_tiers ?? {}
  const ltvTiers = {
    silver:   typeof s.silver   === 'number' ? s.silver   : 1000,
    gold:     typeof s.gold     === 'number' ? s.gold     : 5000,
    platinum: typeof s.platinum === 'number' ? s.platinum : 20000,
  }

  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .eq('cafe_id', cafe.id)
    .order('last_visit_at', { ascending: false, nullsFirst: false })

  const customerIds = (customers ?? []).map(c => c.id)
  let ordersByCustomer: Record<string, any[]> = {}

  if (customerIds.length > 0) {
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number, total_amount, status, created_at, customer_id')
      .eq('cafe_id', cafe.id)
      .in('customer_id', customerIds)
      .order('created_at', { ascending: false })

    for (const o of orders ?? []) {
      if (!ordersByCustomer[o.customer_id]) ordersByCustomer[o.customer_id] = []
      if (ordersByCustomer[o.customer_id].length < 3) {
        ordersByCustomer[o.customer_id].push(o)
      }
    }
  }

  return (
    <CustomersClient
      initialCustomers={(customers ?? []) as Customer[]}
      ordersByCustomer={ordersByCustomer}
      ltvTiers={ltvTiers}
    />
  )
}
