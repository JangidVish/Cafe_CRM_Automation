import { createAdminClient } from '@/lib/supabase/server'
import type { Customer } from '@/lib/types'
import CustomersClient from './CustomersClient'

const DEMO_CAFE_ID = '11111111-1111-1111-1111-111111111111'

export default async function CustomersPage() {
  const supabase = createAdminClient()

  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .eq('cafe_id', DEMO_CAFE_ID)
    .order('last_visit_at', { ascending: false, nullsFirst: false })

  // Fetch recent orders for each customer (last 3 per customer)
  const customerIds = (customers ?? []).map(c => c.id)
  let ordersByCustomer: Record<string, any[]> = {}

  if (customerIds.length > 0) {
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number, total_amount, status, created_at, customer_id')
      .eq('cafe_id', DEMO_CAFE_ID)
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
    />
  )
}
