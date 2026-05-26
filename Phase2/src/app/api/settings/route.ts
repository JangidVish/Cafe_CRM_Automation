import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getOwnerCafe } from '@/lib/supabase/server'

// PATCH /api/settings — shallow-merge partial settings into cafes.settings JSON column
export async function PATCH(req: NextRequest) {
  try {
    const cafe = await getOwnerCafe()
    if (!cafe) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const patch = await req.json()

    const supabase = createAdminClient()

    const { data: row } = await supabase
      .from('cafes')
      .select('settings')
      .eq('id', cafe.id)
      .single()

    const merged = { ...((row?.settings as Record<string, unknown>) ?? {}), ...patch }

    const { data, error } = await supabase
      .from('cafes')
      .update({ settings: merged })
      .eq('id', cafe.id)
      .select('settings')
      .single()

    if (error) throw error
    return NextResponse.json({ data: data.settings, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message }, { status: 500 })
  }
}
