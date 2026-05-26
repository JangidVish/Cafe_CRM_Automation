import { createAdminClient, getOwnerCafe } from '@/lib/supabase/server'
import { startOfDay, endOfDay, subDays, format, getHours } from 'date-fns'
import type { Order } from '@/lib/types'
import NoCafeSetup from '@/components/dashboard/NoCafeSetup'

export const metadata = { title: 'Analytics' }

export default async function AnalyticsPage() {
  const cafe = await getOwnerCafe()
  if (!cafe) return <NoCafeSetup />

  const supabase = createAdminClient()
  const today = new Date()

  const [{ data: orders }, { data: ratingsData }] = await Promise.all([
    supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('cafe_id', cafe.id)
      .gte('created_at', startOfDay(subDays(today, 6)).toISOString())
      .lte('created_at', endOfDay(today).toISOString())
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true }),
    supabase
      .from('order_ratings')
      .select('rating, comment, created_at, orders(order_number)')
      .eq('cafe_id', cafe.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const allOrders: Order[] = (orders ?? []) as Order[]
  const ratings = ratingsData ?? []
  const avgRating = ratings.length > 0
    ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
    : null

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(today, 6 - i)
    const label   = format(d, 'EEE')
    const dateStr = format(d, 'yyyy-MM-dd')
    const dayOrders = allOrders.filter(o => o.created_at.startsWith(dateStr) && o.payment_status === 'paid')
    return { label, revenue: dayOrders.reduce((s, o) => s + o.total_amount, 0), count: dayOrders.length }
  })

  const maxRevenue = Math.max(...days.map(d => d.revenue), 1)

  const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {}
  allOrders.forEach(order => {
    ;(order.items ?? []).forEach((item: any) => {
      if (!itemCounts[item.name]) itemCounts[item.name] = { name: item.name, count: 0, revenue: 0 }
      itemCounts[item.name].count += item.quantity
      itemCounts[item.name].revenue += item.subtotal
    })
  })
  const topItems  = Object.values(itemCounts).sort((a, b) => b.count - a.count).slice(0, 8)
  const maxCount  = Math.max(...topItems.map(i => i.count), 1)

  const todayStr  = format(today, 'yyyy-MM-dd')
  const todayOrders = allOrders.filter(o => o.created_at.startsWith(todayStr))
  const hourly = Array.from({ length: 14 }, (_, i) => {
    const hour  = i + 7
    const count = todayOrders.filter(o => getHours(new Date(o.created_at)) === hour).length
    return { label: `${hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'p' : 'a'}`, count }
  })
  const maxHourly = Math.max(...hourly.map(h => h.count), 1)

  const totalRevenue   = allOrders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + o.total_amount, 0)
  const totalOrders    = allOrders.length
  const avgOrderValue  = totalOrders > 0 ? totalRevenue / totalOrders : 0

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Analytics</h1>
        <p className="text-ink-muted text-sm mt-0.5">Last 7 days</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '7-day revenue',  value: `₹${Math.round(totalRevenue).toLocaleString('en-IN')}` },
          { label: 'Total orders',   value: totalOrders.toString() },
          { label: 'Avg order value', value: avgOrderValue > 0 ? `₹${Math.round(avgOrderValue)}` : '—' },
          { label: 'Avg rating',      value: avgRating ? `★ ${avgRating}` : '—' },
        ].map(m => (
          <div key={m.label} className="bg-surface-raised rounded-2xl border border-ink/5 p-4">
            <p className="text-xs text-ink-faint uppercase tracking-wide font-medium">{m.label}</p>
            <p className="font-display text-2xl font-bold text-ink mt-1">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="bg-surface-raised rounded-2xl border border-ink/5 p-5">
        <h2 className="font-display font-semibold text-ink mb-5">Revenue — last 7 days</h2>
        <div className="flex items-end gap-3 h-40">
          {days.map(d => (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-xs text-ink-muted">
                {d.revenue > 0 ? `₹${Math.round(d.revenue / 100) * 100}` : ''}
              </span>
              <div className="w-full flex items-end" style={{ height: '100px' }}>
                <div
                  className="w-full bg-brand-400 rounded-t-lg transition-all"
                  style={{ height: `${Math.max((d.revenue / maxRevenue) * 100, d.revenue > 0 ? 4 : 0)}%` }}
                />
              </div>
              <span className="text-xs text-ink-faint">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top items */}
        <div className="bg-surface-raised rounded-2xl border border-ink/5 p-5">
          <h2 className="font-display font-semibold text-ink mb-4">Top items (7 days)</h2>
          {topItems.length === 0 ? (
            <p className="text-ink-muted text-sm">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {topItems.map((item, i) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink-faint w-4">{i + 1}</span>
                      <span className="text-sm text-ink truncate">{item.name}</span>
                    </div>
                    <span className="text-xs text-ink-muted shrink-0">{item.count} sold</span>
                  </div>
                  <div className="h-1.5 bg-surface-overlay rounded-full overflow-hidden">
                    <div className="h-full bg-brand-300 rounded-full" style={{ width: `${(item.count / maxCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hourly */}
        <div className="bg-surface-raised rounded-2xl border border-ink/5 p-5">
          <h2 className="font-display font-semibold text-ink mb-4">Orders by hour (today)</h2>
          <div className="flex items-end gap-1.5 h-28">
            {hourly.map(h => (
              <div key={h.label} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end" style={{ height: '80px' }}>
                  <div
                    className="w-full bg-brand-200 rounded-t transition-all"
                    style={{ height: `${Math.max((h.count / maxHourly) * 100, h.count > 0 ? 6 : 0)}%` }}
                  />
                </div>
                <span className="text-[9px] text-ink-faint">{h.label}</span>
              </div>
            ))}
          </div>
          {todayOrders.length === 0 && (
            <p className="text-ink-muted text-sm text-center mt-2">No orders today yet</p>
          )}
        </div>
      </div>

      {/* Recent reviews */}
      {ratings.length > 0 && (
        <div className="bg-surface-raised rounded-2xl border border-ink/5 p-5">
          <h2 className="font-display font-semibold text-ink mb-4">Recent ratings</h2>
          <div className="space-y-3">
            {ratings.map((r: any) => (
              <div key={r.created_at} className="flex items-start gap-3 pb-3 border-b border-ink/5 last:border-0 last:pb-0">
                <div className="text-yellow-400 text-sm shrink-0">
                  {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                </div>
                <div className="flex-1 min-w-0">
                  {r.comment && <p className="text-sm text-ink truncate">{r.comment}</p>}
                  <p className="text-xs text-ink-faint mt-0.5">
                    {r.orders?.order_number} · {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
