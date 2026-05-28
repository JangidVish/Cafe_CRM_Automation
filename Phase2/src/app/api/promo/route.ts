import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/promo?cafeId=X&code=Y&subtotal=Z
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const cafeId  = searchParams.get('cafeId')
    const code    = searchParams.get('code')?.trim().toUpperCase()
    const subtotal = Number(searchParams.get('subtotal') ?? 0)

    if (!cafeId || !code) {
      return NextResponse.json({ data: null, error: 'cafeId and code required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: row } = await supabase
      .from('cafes')
      .select('settings')
      .eq('id', cafeId)
      .single()

    const promoCodes: Array<{ code: string; type: 'percent' | 'flat'; value: number; active: boolean }> =
      (row?.settings as any)?.promo_codes ?? []

    const promo = promoCodes.find(
      p => p.active && p.code.toUpperCase() === code
    )

    if (!promo) {
      return NextResponse.json({ data: null, error: 'Invalid or expired promo code' }, { status: 404 })
    }

    const discount = promo.type === 'percent'
      ? Math.round((subtotal * promo.value) / 100)
      : promo.value

    return NextResponse.json({
      data: { code: promo.code, type: promo.type, value: promo.value, discount: Math.min(discount, subtotal) },
      error: null,
    })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message }, { status: 500 })
  }
}
