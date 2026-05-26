import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getOwnerCafe } from '@/lib/supabase/server'

export async function GET() {
  const cafe = await getOwnerCafe()
  if (!cafe) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('cafe_id', cafe.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function POST(req: NextRequest) {
  try {
    const cafe = await getOwnerCafe()
    if (!cafe) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { name, segment, message } = await req.json()
    if (!name || !message) return NextResponse.json({ error: 'name and message required' }, { status: 400 })

    // Count matching customers for preview
    const supabase = createAdminClient()
    let countQuery = supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('cafe_id', cafe.id)
    if (segment && segment !== 'all') {
      countQuery = countQuery.contains('tags', [segment])
    }
    const { count } = await countQuery

    const { data, error } = await supabase
      .from('campaigns')
      .insert({ cafe_id: cafe.id, name, segment: segment ?? 'all', message })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data: { ...data, recipientCount: count ?? 0 }, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message }, { status: 500 })
  }
}
