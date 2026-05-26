import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getOwnerCafe } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const cafe = await getOwnerCafe()
  if (!cafe) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('cafe_id', cafe.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  const header = ['Name', 'Phone', 'Total Orders', 'Total Spent (₹)', 'Last Visit', 'Tags', 'Points Balance', 'Joined']
  const lines = [
    header.join(','),
    ...rows.map(c => [
      `"${(c.name ?? '').replace(/"/g, '""')}"`,
      c.phone,
      c.total_orders,
      Math.round(c.total_spent),
      c.last_visit_at ? new Date(c.last_visit_at).toLocaleDateString('en-IN') : '',
      `"${(c.tags ?? []).join(', ')}"`,
      c.points_balance ?? 0,
      new Date(c.created_at).toLocaleDateString('en-IN'),
    ].join(',')),
  ]

  return new NextResponse(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="customers-${cafe.slug}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
