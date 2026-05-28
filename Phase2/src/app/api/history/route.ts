import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/history?cafeId=X&phone=Y
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const cafeId = searchParams.get('cafeId')
  const phone  = searchParams.get('phone')?.replace(/\D/g, '')

  if (!cafeId || !phone || phone.length < 10) {
    return NextResponse.json({ data: null, error: 'cafeId and valid phone required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, total_orders, total_spent, points_balance')
    .eq('cafe_id', cafeId)
    .eq('phone', phone)
    .single()

  if (!customer) {
    return NextResponse.json({ data: { customer: null, orders: [] }, error: null })
  }

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, total_amount, status, payment_status, created_at, items:order_items(id, menu_item_id, name, price, quantity)')
    .eq('cafe_id', cafeId)
    .eq('customer_id', customer.id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ data: { customer, orders: orders ?? [] }, error: null })
}
