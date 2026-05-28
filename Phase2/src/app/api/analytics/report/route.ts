import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getOwnerCafe } from '@/lib/supabase/server'
import { subMonths, format, startOfMonth, endOfMonth } from 'date-fns'

// GET /api/analytics/report?months=6
// Returns a CSV of monthly revenue, orders, and AOV
export async function GET(req: NextRequest) {
  const cafe = await getOwnerCafe()
  if (!cafe) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const months = Math.min(parseInt(new URL(req.url).searchParams.get('months') ?? '6', 10), 12)
  const supabase = createAdminClient()

  const since = startOfMonth(subMonths(new Date(), months - 1))

  const { data: orders, error } = await supabase
    .from('orders')
    .select('total_amount, created_at')
    .eq('cafe_id', cafe.id)
    .eq('payment_status', 'paid')
    .neq('status', 'cancelled')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group by month
  const byMonth: Record<string, { orders: number; revenue: number }> = {}
  for (const o of orders ?? []) {
    const key = format(new Date(o.created_at), 'yyyy-MM')
    if (!byMonth[key]) byMonth[key] = { orders: 0, revenue: 0 }
    byMonth[key].orders++
    byMonth[key].revenue += Number(o.total_amount)
  }

  // Fill in empty months
  for (let i = 0; i < months; i++) {
    const key = format(subMonths(new Date(), months - 1 - i), 'yyyy-MM')
    if (!byMonth[key]) byMonth[key] = { orders: 0, revenue: 0 }
  }

  const rows = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, d]) => {
      const label = format(new Date(`${month}-01`), 'MMM yyyy')
      const aov   = d.orders > 0 ? (d.revenue / d.orders).toFixed(2) : '0.00'
      return `"${label}",${d.orders},${d.revenue.toFixed(2)},${aov}`
    })

  const csv = ['Month,Orders,Revenue (INR),AOV (INR)', ...rows].join('\n')
  const filename = `revenue-report-${format(new Date(), 'yyyy-MM-dd')}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
