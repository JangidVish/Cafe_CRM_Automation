import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getOwnerCafe } from '@/lib/supabase/server'

// GET /api/loyalty — fetch config for owner dashboard
// GET /api/loyalty?cafeId=...&phone=... — fetch customer points balance (public)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const cafeId = searchParams.get('cafeId')
  const phone  = searchParams.get('phone')

  const supabase = createAdminClient()

  // Public: fetch customer's points balance + loyalty config
  if (cafeId && phone) {
    const [configRes, customerRes] = await Promise.all([
      supabase.from('loyalty_config').select('*').eq('cafe_id', cafeId).single(),
      supabase.from('customers').select('points_balance').eq('cafe_id', cafeId).eq('phone', phone).single(),
    ])
    const config  = configRes.data
    const balance = customerRes.data?.points_balance ?? 0
    return NextResponse.json({ data: { config, balance }, error: null })
  }

  // Owner: fetch their cafe's config
  const cafe = await getOwnerCafe()
  if (!cafe) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data, error } = await supabase
    .from('loyalty_config')
    .select('*')
    .eq('cafe_id', cafe.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data: data ?? null, error: null })
}

export async function PUT(req: NextRequest) {
  try {
    const cafe = await getOwnerCafe()
    if (!cafe) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await req.json()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('loyalty_config')
      .upsert({
        cafe_id:              cafe.id,
        points_per_rupee:     body.pointsPerRupee ?? 0.1,
        rupees_per_point:     body.rupeesPerPoint ?? 0.5,
        min_points_to_redeem: body.minPointsToRedeem ?? 50,
        is_enabled:           body.isEnabled ?? true,
      }, { onConflict: 'cafe_id' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message }, { status: 500 })
  }
}
