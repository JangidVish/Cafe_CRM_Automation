import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { createAdminClient } from '@/lib/supabase/server'

// GET  /api/tables?cafeId=xxx          — list all tables
// POST /api/tables { action:'generate-qr', cafeId, cafeSlug } — generate QR data URLs
// POST /api/tables { action:'create', cafeId, number, label } — add a new table
// PATCH /api/tables { tableId, ...fields }                    — update label / toggle is_active

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body
    const supabase = createAdminClient()

    if (action === 'create') {
      const { cafeId, number, label, capacity = 4 } = body
      const { data, error } = await supabase
        .from('tables')
        .insert({ cafe_id: cafeId, number, label: label || null, capacity })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ data, error: null })
    }

    // action === 'generate-qr' (default)
    const { cafeId, cafeSlug } = body
    const { data: tables, error } = await supabase
      .from('tables')
      .select('*')
      .eq('cafe_id', cafeId)
      .eq('is_active', true)
      .order('number')

    if (error) throw error

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const qrResults = await Promise.all(
      (tables ?? []).map(async (table) => {
        const menuUrl = `${appUrl}/menu/${table.number}?cafe=${cafeSlug}`
        const qrDataUrl = await QRCode.toDataURL(menuUrl, {
          width: 400,
          margin: 2,
          color: { dark: '#1A1A18', light: '#FFFFFF' },
          errorCorrectionLevel: 'H',
        })
        return { tableId: table.id, tableNumber: table.number, label: table.label, menuUrl, qrDataUrl }
      })
    )

    return NextResponse.json({ data: qrResults, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { tableId, ...fields } = await req.json()
    if (!tableId) return NextResponse.json({ error: 'tableId required' }, { status: 400 })

    const allowed = ['label', 'is_active', 'capacity', 'number']
    const update: Record<string, unknown> = {}
    for (const key of allowed) {
      if (fields[key] !== undefined) update[key] = fields[key]
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('tables')
      .update(update)
      .eq('id', tableId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const cafeId = new URL(req.url).searchParams.get('cafeId')
  if (!cafeId) return NextResponse.json({ error: 'cafeId required' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .eq('cafe_id', cafeId)
    .order('number')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, error: null })
}
