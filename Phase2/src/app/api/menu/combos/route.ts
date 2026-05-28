import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/menu/combos?cafeId=X&itemIds=a,b,c
// Returns top 3 items frequently ordered alongside the given item IDs
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const cafeId  = searchParams.get('cafeId')
  const itemIds = searchParams.get('itemIds')?.split(',').filter(Boolean) ?? []

  if (!cafeId || itemIds.length === 0) {
    return NextResponse.json({ data: [], error: null })
  }

  const supabase = createAdminClient()

  // Find orders that contain any of the given items (last 200 orders)
  const { data: relevantItems } = await supabase
    .from('order_items')
    .select('order_id')
    .in('menu_item_id', itemIds)
    .limit(200)

  if (!relevantItems || relevantItems.length === 0) {
    return NextResponse.json({ data: [], error: null })
  }

  const orderIds = [...new Set(relevantItems.map(r => r.order_id))]

  // Find all other items in those orders
  const { data: coItems } = await supabase
    .from('order_items')
    .select('menu_item_id, menu_items(id, name, price, image_url, is_veg, is_available)')
    .in('order_id', orderIds)
    .limit(500)

  if (!coItems || coItems.length === 0) {
    return NextResponse.json({ data: [], error: null })
  }

  const cartSet = new Set(itemIds)
  const counts: Record<string, { item: any; count: number }> = {}

  for (const row of coItems) {
    const id = row.menu_item_id
    if (cartSet.has(id)) continue
    const item = (row as any).menu_items
    if (!item?.is_available) continue
    if (!counts[id]) counts[id] = { item, count: 0 }
    counts[id].count++
  }

  const top = Object.values(counts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(c => c.item)

  return NextResponse.json({ data: top, error: null })
}
