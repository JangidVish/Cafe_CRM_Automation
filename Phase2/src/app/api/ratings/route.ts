import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getOwnerCafe } from '@/lib/supabase/server'
import { sendWhatsApp } from '@/lib/utils/whatsapp'

export async function POST(req: NextRequest) {
  try {
    const { orderId, rating, comment } = await req.json()
    if (!orderId || !rating) return NextResponse.json({ error: 'orderId and rating required' }, { status: 400 })
    if (rating < 1 || rating > 5) return NextResponse.json({ error: 'rating must be 1–5' }, { status: 400 })

    const supabase = createAdminClient()

    // Fetch order + cafe for validation
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, cafe_id, order_number, cafes(whatsapp, name)')
      .eq('id', orderId)
      .single()

    if (orderErr || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const { data, error } = await supabase
      .from('order_ratings')
      .insert({ cafe_id: order.cafe_id, order_id: orderId, rating, comment: comment || null })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Already rated' }, { status: 409 })
      throw error
    }

    // Alert owner on low rating
    if (rating <= 2) {
      const cafe = order.cafes as any
      if (cafe?.whatsapp) {
        await sendWhatsApp(
          cafe.whatsapp,
          `⚠️ *Low Rating Alert*\n\nOrder *${order.order_number}* received a ${rating}⭐ rating.\nComment: ${comment || 'No comment'}\n\nPlease follow up.`
        )
      }
    }

    return NextResponse.json({ data, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const cafe = await getOwnerCafe()
  if (!cafe) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('order_ratings')
    .select('*, orders(order_number)')
    .eq('cafe_id', cafe.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

  const ratings = data ?? []
  const avg = ratings.length > 0
    ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
    : null

  return NextResponse.json({ data: { ratings, avg, count: ratings.length }, error: null })
}
