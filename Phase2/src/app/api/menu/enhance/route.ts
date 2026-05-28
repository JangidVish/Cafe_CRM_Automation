import { NextRequest, NextResponse } from 'next/server'
import { getOwnerCafe } from '@/lib/supabase/server'

// POST /api/menu/enhance
// Body: { name, description, category }
// Uses Claude API to enhance menu item description
export async function POST(req: NextRequest) {
  const cafe = await getOwnerCafe()
  if (!cafe) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ data: null, error: 'Add ANTHROPIC_API_KEY to your .env to enable AI descriptions' }, { status: 503 })
  }

  try {
    const { name, description, category } = await req.json()
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    const prompt = `You are a restaurant menu copywriter for an Indian cafe. Write an appetizing, authentic description for this menu item. Keep it concise — max 2 sentences, under 70 words. Be specific about flavours, textures, or preparation. No marketing fluff.

Item: ${name}
Category: ${category ?? 'Menu item'}
Current description: ${description || 'None'}

Write only the description text. No quotes, no labels, no extra commentary.`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[enhance] Claude API error:', text)
      return NextResponse.json({ data: null, error: 'AI request failed' }, { status: 500 })
    }

    const json = await res.json()
    const enhanced = (json.content?.[0]?.text ?? '').trim()

    return NextResponse.json({ data: { description: enhanced }, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message }, { status: 500 })
  }
}
