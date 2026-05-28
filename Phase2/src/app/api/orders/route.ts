import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendOrderConfirmation, sendOwnerAlert } from '@/lib/utils/whatsapp'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      cafeId, tableId, items,
      paymentMethod, notes, customerPhone,
      subtotal, taxAmount, serviceCharge, discountAmount, totalAmount,
      pointsRedeemed,
    } = body

    const supabase = createAdminClient()

    // Upsert customer if phone provided
    let customerId: string | null = null
    if (customerPhone) {
      const { data: customer } = await supabase
        .from('customers')
        .upsert(
          { cafe_id: cafeId, phone: customerPhone, whatsapp: customerPhone },
          { onConflict: 'cafe_id,phone', ignoreDuplicates: false }
        )
        .select('id')
        .single()
      customerId = customer?.id ?? null
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        cafe_id: cafeId,
        table_id: tableId,
        customer_id: customerId,
        order_number: `ORD-${Date.now().toString().slice(-4)}`,
        status: 'pending',
        payment_method: paymentMethod,
        payment_status: 'pending',
        subtotal,
        tax_amount: taxAmount,
        service_charge: serviceCharge ?? 0,
        discount_amount: discountAmount ?? 0,
        total_amount: totalAmount,
        notes: notes || null,
        points_redeemed: pointsRedeemed ?? 0,
      })
      .select()
      .single()

    if (orderError) throw orderError

    // Insert order items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      menu_item_id: item.menuItemId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      customisation: item.customisation || null,
      subtotal: item.price * item.quantity,
      status: 'pending',
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) throw itemsError

    // Deduct redeemed points
    if (pointsRedeemed && pointsRedeemed > 0 && customerId) {
      try {
        const { data: customer } = await supabase
          .from('customers').select('points_balance').eq('id', customerId).single()
        if (customer) {
          const newBal = Math.max(0, (customer.points_balance ?? 0) - pointsRedeemed)
          await Promise.all([
            supabase.from('customer_points').insert({
              cafe_id:     cafeId,
              customer_id: customerId,
              order_id:    order.id,
              type:        'redeem',
              points:      -pointsRedeemed,
              balance:     newBal,
            }),
            supabase.from('customers').update({ points_balance: newBal }).eq('id', customerId),
          ])
        }
      } catch { /* never fail order creation for points errors */ }
    }

    // Fetch cafe for name + owner whatsapp
    const { data: cafe } = await supabase
      .from('cafes')
      .select('name, whatsapp')
      .eq('id', cafeId)
      .single()

    // Fetch table number
    const { data: table } = await supabase
      .from('tables')
      .select('number')
      .eq('id', tableId)
      .single()

    const whatsappPayload = {
      phone: customerPhone ?? '',
      orderNumber: order.order_number,
      orderId: order.id,
      cafeName: cafe?.name ?? 'Cafe',
      tableNumber: table?.number ?? 0,
      items: items.map((i: any) => ({ name: i.name, quantity: i.quantity, price: i.price })),
      total: totalAmount,
    }

    // Fire WhatsApp notifications — both run async, never block response
    if (customerPhone) {
      sendOrderConfirmation(whatsappPayload)
    }
    if (cafe?.whatsapp) {
      sendOwnerAlert(cafe.whatsapp, whatsappPayload)
    }

    return NextResponse.json({ data: order, error: null })
  } catch (err: any) {
    console.error('[POST /api/orders]', err)
    return NextResponse.json({ data: null, error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { orderId, status } = await req.json()
    const supabase = createAdminClient()

    const updateData: Record<string, any> = { status }
    if (status === 'confirmed') updateData.confirmed_at = new Date().toISOString()
    if (status === 'ready')     updateData.ready_at = new Date().toISOString()
    if (status === 'served')    updateData.served_at = new Date().toISOString()
    if (status === 'completed') updateData.completed_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single()

    if (error) throw error

    // Earn loyalty points when order completes
    if (status === 'completed' && data.customer_id) {
      try {
        const [{ data: loyaltyConfig }, { data: customer }] = await Promise.all([
          supabase.from('loyalty_config').select('*').eq('cafe_id', data.cafe_id).single(),
          supabase.from('customers').select('points_balance').eq('id', data.customer_id).single(),
        ])

        if (loyaltyConfig?.is_enabled && customer) {
          const earned  = Math.floor(Number(data.total_amount) * Number(loyaltyConfig.points_per_rupee))
          const newBal  = (customer.points_balance ?? 0) + earned

          if (earned > 0) {
            await Promise.all([
              supabase.from('customer_points').insert({
                cafe_id:     data.cafe_id,
                customer_id: data.customer_id,
                order_id:    orderId,
                type:        'earn',
                points:      earned,
                balance:     newBal,
              }),
              supabase.from('customers').update({ points_balance: newBal }).eq('id', data.customer_id),
              supabase.from('orders').update({ points_earned: earned }).eq('id', orderId),
            ])
          }
        }
      } catch { /* never fail the status update for points errors */ }
    }

    return NextResponse.json({ data, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const cafeId = searchParams.get('cafeId')
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  if (!cafeId) return NextResponse.json({ error: 'cafeId required' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*), table:tables(number,label)')
    .eq('cafe_id', cafeId)
    .gte('created_at', `${date}T00:00:00`)
    .lte('created_at', `${date}T23:59:59`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, error: null })
}
