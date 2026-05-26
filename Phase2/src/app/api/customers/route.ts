import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const DEMO_CAFE_ID = '11111111-1111-1111-1111-111111111111'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const cafeId = searchParams.get('cafeId') ?? DEMO_CAFE_ID

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('cafe_id', cafeId)
    .order('last_visit_at', { ascending: false, nullsFirst: false })

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function PATCH(req: NextRequest) {
  try {
    const { customerId, name, tags } = await req.json()
    if (!customerId) return NextResponse.json({ error: 'customerId required' }, { status: 400 })

    const supabase = createAdminClient()
    const update: Record<string, unknown> = {}
    if (name !== undefined) update.name = name || null
    if (tags !== undefined) update.tags = tags

    const { data, error } = await supabase
      .from('customers')
      .update(update)
      .eq('id', customerId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message }, { status: 500 })
  }
}
