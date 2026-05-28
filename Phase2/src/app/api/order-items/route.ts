import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const ITEM_STATUS_FLOW: Record<string, string> = {
  pending: 'making',
  making:  'done',
}

export async function PATCH(req: NextRequest) {
  try {
    const { itemId, status } = await req.json()
    if (!itemId || !status) {
      return NextResponse.json({ error: 'itemId and status required' }, { status: 400 })
    }
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('order_items')
      .update({ status })
      .eq('id', itemId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message }, { status: 500 })
  }
}
