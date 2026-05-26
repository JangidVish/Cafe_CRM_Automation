import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getOwnerCafe } from '@/lib/supabase/server'
import { sendWhatsApp } from '@/lib/utils/whatsapp'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cafe = await getOwnerCafe()
    if (!cafe) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const supabase = createAdminClient()

    const { data: campaign, error: campErr } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', params.id)
      .eq('cafe_id', cafe.id)
      .single()

    if (campErr || !campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    if (campaign.status === 'sent') return NextResponse.json({ error: 'Already sent' }, { status: 409 })

    // Fetch target customers
    let query = supabase
      .from('customers')
      .select('id, phone, name')
      .eq('cafe_id', cafe.id)
    if (campaign.segment !== 'all') {
      query = query.contains('tags', [campaign.segment])
    }
    const { data: customers } = await query

    const targets = (customers ?? []).filter(c => c.phone)

    // Mark as sending
    await supabase.from('campaigns').update({ status: 'sending' }).eq('id', campaign.id)

    let sentCount = 0
    let failedCount = 0

    for (const customer of targets) {
      try {
        const personalised = campaign.message
          .replace(/\{name\}/g, customer.name ?? 'Valued customer')
        await sendWhatsApp(customer.phone, personalised)
        sentCount++
      } catch {
        failedCount++
      }
    }

    const { data, error } = await supabase
      .from('campaigns')
      .update({
        status:       'sent',
        sent_at:      new Date().toISOString(),
        sent_count:   sentCount,
        failed_count: failedCount,
      })
      .eq('id', campaign.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message }, { status: 500 })
  }
}
