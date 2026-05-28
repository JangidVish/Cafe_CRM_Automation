'use client'
import { useEffect, useState } from 'react'
import { useCartStore } from '@/lib/hooks/useCart'
import type { MenuPageData, MenuCategory, MenuItem } from '@/lib/types'
import MenuHeader from './MenuHeader'
import CategoryNav from './CategoryNav'
import MenuItemCard from './MenuItemCard'
import CartBar from './CartBar'
import CartSheet from './CartSheet'

interface Props { data: MenuPageData }

const WEATHER_BANNER: Record<string, { emoji: string; text: string; category?: string }> = {
  Clear:        { emoji: '☀️', text: "It's sunny and warm — cool down with cold beverages!" },
  Clouds:       { emoji: '🌥️', text: 'A cloudy day — perfect for hot tea or coffee.' },
  Rain:         { emoji: '🌧️', text: 'It\'s raining outside — warm up with a hot drink!' },
  Drizzle:      { emoji: '🌦️', text: 'Light rain outside — stay warm with a hot beverage.' },
  Thunderstorm: { emoji: '⛈️', text: 'Stormy outside — a hot drink is just what you need.' },
  Snow:         { emoji: '❄️', text: 'It\'s cold outside — hot drinks are on us!' },
  Haze:         { emoji: '🌫️', text: 'Hazy day — try something light and refreshing.' },
  Mist:         { emoji: '🌫️', text: 'Misty outside — warm up with our hot beverages.' },
}

export default function MenuShell({ data }: Props) {
  const { cafe, table, categories, weather } = data
  const { initCart, itemCount } = useCartStore()
  const [cartOpen, setCartOpen] = useState(false)
  const [lang, setLang] = useState<'en' | 'hi'>('en')
  const [filter, setFilter] = useState<'all' | 'veg' | 'nonveg'>('all')
  const [activeCat, setActiveCat] = useState(categories[0]?.id ?? '')

  useEffect(() => {
    useCartStore.persist.rehydrate()
    initCart(cafe.id, table.id, table.number)
  }, [cafe.id, table.id, table.number])

  const allItems: MenuItem[] = categories.flatMap(cat => cat.items ?? [])
  const weatherBanner = weather ? WEATHER_BANNER[weather.condition] : null

  const filteredCategories: MenuCategory[] = categories.map(cat => ({
    ...cat,
    items: (cat.items ?? []).filter(item => {
      if (!item.is_available) return false
      if (filter === 'veg') return item.is_veg
      if (filter === 'nonveg') return !item.is_veg
      return true
    }),
  })).filter(cat => (cat.items ?? []).length > 0)

  return (
    <div className="min-h-screen bg-surface">
      <MenuHeader
        cafe={cafe}
        table={table}
        lang={lang}
        onLangToggle={() => setLang(l => l === 'en' ? 'hi' : 'en')}
        filter={filter}
        onFilterChange={setFilter}
      />

      {/* Weather banner */}
      {weatherBanner && weather && (
        <div className="px-4 pt-2 pb-1 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-xl px-3 py-2 text-sm text-brand-700">
            <span className="text-base">{weatherBanner.emoji}</span>
            <span>{weatherBanner.text}</span>
            <span className="ml-auto text-xs text-brand-500 shrink-0">{weather.temp}°C</span>
          </div>
        </div>
      )}

      <CategoryNav
        categories={filteredCategories}
        activeCat={activeCat}
        onSelect={setActiveCat}
        lang={lang}
      />

      <main className="px-4 pb-32 max-w-2xl mx-auto">
        {filteredCategories.map(cat => (
          <section key={cat.id} id={`cat-${cat.id}`} className="mb-8">
            <h2 className="font-display text-xl font-semibold text-ink mb-4 pt-4">
              {lang === 'hi' && cat.name_hi ? cat.name_hi : cat.name}
            </h2>
            {(() => {
                const sorted = [...(cat.items ?? [])].sort((a, b) => b.order_count - a.order_count)
                const hasImages = sorted.some(i => i.image_url)
                return (
                  <div className={hasImages ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
                    {sorted.map((item: MenuItem) => (
                      <MenuItemCard
                        key={item.id}
                        item={item}
                        lang={lang}
                        showSocialProof={cafe.settings.show_social_proof}
                      />
                    ))}
                  </div>
                )
              })()}
          </section>
        ))}
      </main>

      {/* Sticky cart bar at bottom */}
      {itemCount() > 0 && (
        <CartBar itemCount={itemCount()} onOpen={() => setCartOpen(true)} />
      )}

      {/* Cart slide-up sheet */}
      {cartOpen && (
        <CartSheet
          cafe={cafe}
          table={table}
          allItems={allItems}
          onClose={() => setCartOpen(false)}
        />
      )}
    </div>
  )
}
