import { createAdminClient, getOwnerCafe } from '@/lib/supabase/server'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'
import type { Order } from '@/lib/types'
import NoCafeSetup from '@/components/dashboard/NoCafeSetup'
import OrdersClient from './OrdersClient'

export const metadata = { title: 'Orders' }

interface Props {
  searchParams: { date?: string; status?: string }
}

export default async function OrdersPage({ searchParams }: Props) {
  const cafe = await getOwnerCafe()
  if (!cafe) return <NoCafeSetup />

  const supabase = createAdminClient()
  const dateStr = searchParams.date ?? format(new Date(), 'yyyy-MM-dd')
  const day = new Date(dateStr)

  const { data: orders } = await supabase
    .from('orders')
    .select('*, items:order_items(*), table:tables(number,label)')
    .eq('cafe_id', cafe.id)
    .gte('created_at', startOfDay(day).toISOString())
    .lte('created_at', endOfDay(day).toISOString())
    .order('created_at', { ascending: false })

  const dates = Array.from({ length: 7 }, (_, i) =>
    format(subDays(new Date(), i), 'yyyy-MM-dd')
  )

  return (
    <OrdersClient
      orders={(orders ?? []) as Order[]}
      currentDate={dateStr}
      availableDates={dates}
      activeStatus={searchParams.status ?? 'all'}
    />
  )
}
