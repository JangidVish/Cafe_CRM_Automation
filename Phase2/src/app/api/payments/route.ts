import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import crypto from 'crypto'

const RAZORPAY_KEY_ID     = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? ''
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? ''
const RZP_BASE = 'https://api.razorpay.com/v1'

function rzpAuth() {
  return 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'create') {
      return await createOrder(body)
    }
    if (action === 'verify') {
      return await verifyPayment(body)
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    console.error('[POST /api/payments]', err)
    return NextResponse.json({ data: null, error: err.message }, { status: 500 })
  }
}

// ── Create Razorpay order ─────────────────────────────────────
async function createOrder(body: { orderId: string; amount: number }) {
  const { orderId, amount } = body

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return NextResponse.json(
      { error: 'Razorpay not configured — add NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.local' },
      { status: 503 }
    )
  }

  // amount in paise (₹1 = 100 paise)
  const rzpRes = await fetch(`${RZP_BASE}/orders`, {
    method: 'POST',
    headers: {
      Authorization: rzpAuth(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: orderId,
    }),
  })

  const rzpOrder = await rzpRes.json()
  if (!rzpRes.ok) {
    throw new Error(rzpOrder.error?.description ?? 'Razorpay order creation failed')
  }

  // Store razorpay_order_id on our order row
  const supabase = createAdminClient()
  await supabase
    .from('orders')
    .update({ razorpay_order_id: rzpOrder.id })
    .eq('id', orderId)

  return NextResponse.json({
    data: {
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,       // paise
      keyId: RAZORPAY_KEY_ID,
    },
    error: null,
  })
}

// ── Verify Razorpay payment signature ────────────────────────
async function verifyPayment(body: {
  orderId: string
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}) {
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = body

  const expected = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex')

  if (expected !== razorpaySignature) {
    return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('orders')
    .update({
      payment_status:       'paid',
      razorpay_payment_id:  razorpayPaymentId,
    })
    .eq('id', orderId)

  if (error) throw error

  return NextResponse.json({ data: { success: true }, error: null })
}
