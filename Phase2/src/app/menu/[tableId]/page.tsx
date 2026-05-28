import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { MenuPageData } from '@/lib/types'
import MenuShell from '@/components/menu/MenuShell'

interface Props {
  params: { tableId: string }
  searchParams: { cafe?: string }
}

export async function generateMetadata({ searchParams }: Props) {
  const supabase = createServerSupabaseClient()
  const cafeSlug = searchParams.cafe ?? 'sunrise-cafe'
  const { data: cafe } = await supabase
    .from('cafes').select('name').eq('slug', cafeSlug).single()
  return { title: cafe?.name ?? 'Menu' }
}

export default async function MenuPage({ params, searchParams }: Props) {
  const supabase = createServerSupabaseClient()
  const cafeSlug = searchParams.cafe ?? 'sunrise-cafe'
  const tableNumber = parseInt(params.tableId, 10)

  // Fetch cafe
  const { data: cafe } = await supabase
    .from('cafes')
    .select('*')
    .eq('slug', cafeSlug)
    .eq('is_active', true)
    .single()
  if (!cafe) notFound()

  // Fetch table
  const { data: table } = await supabase
    .from('tables')
    .select('*')
    .eq('cafe_id', cafe.id)
    .eq('number', tableNumber)
    .eq('is_active', true)
    .single()
  if (!table) notFound()

  // Fetch full menu with categories
  const { data: categories } = await supabase
    .from('menu_categories')
    .select('*, items:menu_items(*)')
    .eq('cafe_id', cafe.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  // Fetch weather if cafe has a city configured in settings
  let weather = null
  const city = (cafe.settings as any)?.city
  const weatherKey = process.env.OPENWEATHER_API_KEY
  if (city && weatherKey) {
    try {
      const wr = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${weatherKey}&units=metric`,
        { next: { revalidate: 300 } }
      )
      if (wr.ok) {
        const wj = await wr.json()
        weather = {
          temp:        Math.round(wj.main.temp),
          feels_like:  Math.round(wj.main.feels_like),
          condition:   wj.weather[0].main as string,
          description: wj.weather[0].description as string,
        }
      }
    } catch { /* weather is optional, never block the menu */ }
  }

  const pageData: MenuPageData = {
    cafe,
    table,
    categories: categories ?? [],
    weather,
  }

  return <MenuShell data={pageData} />
}
