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
    .order('last_visit_at', { ascending: false, nullsFirst: false })

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json()

    if (action === 'auto-tag') {
      const cafe = await getOwnerCafe()
      if (!cafe) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

      const supabase = createAdminClient()
      const { data, error } = await supabase.rpc('auto_tag_customers', { p_cafe_id: cafe.id })
      if (error) throw error
      return NextResponse.json({ data: { count: data }, error: null })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message }, { status: 500 })
  }
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
