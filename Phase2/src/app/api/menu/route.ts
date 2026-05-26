import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const ITEM_FIELDS = [
  'name','name_hi','description','price','category_id',
  'image_url','is_veg','is_vegan','is_jain','contains_gluten',
  'contains_nuts','spice_level','is_available','is_featured',
  'sort_order','prep_time_mins',
] as const

const CAT_FIELDS = ['name','name_hi','description','image_url','sort_order','is_active'] as const

// GET /api/menu?cafeId=xxx
export async function GET(req: NextRequest) {
  const cafeId = new URL(req.url).searchParams.get('cafeId')
  if (!cafeId) return NextResponse.json({ error: 'cafeId required' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*, items:menu_items(*)')
    .eq('cafe_id', cafeId)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

// POST /api/menu
// body: { action: 'create-item', cafeId, categoryId, name, price, ... }
// body: { action: 'create-category', cafeId, name, name_hi? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createAdminClient()

    if (body.action === 'create-category') {
      const { cafeId, name, name_hi } = body

      // next sort_order
      const { data: existing } = await supabase
        .from('menu_categories')
        .select('sort_order')
        .eq('cafe_id', cafeId)
        .order('sort_order', { ascending: false })
        .limit(1)
      const sort_order = (existing?.[0]?.sort_order ?? 0) + 1

      const { data, error } = await supabase
        .from('menu_categories')
        .insert({ cafe_id: cafeId, name, name_hi: name_hi || null, sort_order })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ data, error: null })
    }

    if (body.action === 'create-item') {
      const { cafeId, categoryId, ...rest } = body
      delete rest.action

      const { data: existing } = await supabase
        .from('menu_items')
        .select('sort_order')
        .eq('category_id', categoryId)
        .order('sort_order', { ascending: false })
        .limit(1)
      const sort_order = (existing?.[0]?.sort_order ?? 0) + 1

      const insert: Record<string, unknown> = { cafe_id: cafeId, category_id: categoryId, sort_order }
      for (const key of ITEM_FIELDS) {
        if (rest[key] !== undefined) insert[key] = rest[key]
      }

      const { data, error } = await supabase
        .from('menu_items')
        .insert(insert)
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ data, error: null })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message }, { status: 500 })
  }
}

// PATCH /api/menu
// body: { target: 'item', itemId, ...fields }
// body: { target: 'category', categoryId, ...fields }
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createAdminClient()

    if (body.target === 'category') {
      const { categoryId, ...rest } = body
      const update: Record<string, unknown> = {}
      for (const key of CAT_FIELDS) {
        if (rest[key] !== undefined) update[key] = rest[key]
      }
      const { data, error } = await supabase
        .from('menu_categories')
        .update(update)
        .eq('id', categoryId)
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ data, error: null })
    }

    // default: item
    const { itemId, ...rest } = body
    if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 })

    const update: Record<string, unknown> = {}
    for (const key of ITEM_FIELDS) {
      if (rest[key] !== undefined) update[key] = rest[key]
    }

    const { data, error } = await supabase
      .from('menu_items')
      .update(update)
      .eq('id', itemId)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ data, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message }, { status: 500 })
  }
}

// DELETE /api/menu
// body: { target: 'item', itemId }
// body: { target: 'category', categoryId }
export async function DELETE(req: NextRequest) {
  try {
    const { target, itemId, categoryId } = await req.json()
    const supabase = createAdminClient()

    if (target === 'category') {
      const { error } = await supabase
        .from('menu_categories')
        .delete()
        .eq('id', categoryId)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemId)
      if (error) throw error
    }

    return NextResponse.json({ data: { success: true }, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message }, { status: 500 })
  }
}
