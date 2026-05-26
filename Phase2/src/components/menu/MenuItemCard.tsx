'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Flame, Plus, Minus } from 'lucide-react'
import { useCartStore } from '@/lib/hooks/useCart'
import type { MenuItem } from '@/lib/types'
import toast from 'react-hot-toast'

interface Props {
  item: MenuItem
  lang: 'en' | 'hi'
  showSocialProof: boolean
}

const SPICE_ICONS = ['', '🌶', '🌶🌶', '🌶🌶🌶']

export default function MenuItemCard({ item, lang, showSocialProof }: Props) {
  const { addItem, updateQuantity, cart } = useCartStore()
  const [note, setNote] = useState('')

  const cartItem = cart?.items.find(i => i.menuItem.id === item.id)
  const qty = cartItem?.quantity ?? 0

  const name = lang === 'hi' && item.name_hi ? item.name_hi : item.name
  const desc = lang === 'hi' && item.description_hi ? item.description_hi : item.description

  function handleAdd() {
    addItem(item, 1, note || undefined)
    toast.success(`${item.name} added`)
  }

  const badges = (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span
        className={item.is_veg ? 'veg-dot' : 'nonveg-dot'}
        title={item.is_veg ? 'Vegetarian' : 'Non-vegetarian'}
      />
      {item.spice_level > 0 && (
        <span className="text-xs">{SPICE_ICONS[item.spice_level]}</span>
      )}
      {item.is_featured && (
        <span className="text-[10px] font-medium text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded-full">
          Popular
        </span>
      )}
    </div>
  )

  const addControls = !item.is_available ? (
    <span className="text-xs text-ink-faint bg-surface-overlay px-3 py-1.5 rounded-full">
      Unavailable
    </span>
  ) : qty === 0 ? (
    <button
      onClick={handleAdd}
      className="flex items-center gap-1 bg-brand-400 hover:bg-brand-500 text-white text-sm font-medium px-4 py-1.5 rounded-full transition-colors active:scale-95"
    >
      <Plus size={14} />
      Add
    </button>
  ) : (
    <div className="flex items-center gap-2 bg-surface-overlay rounded-full px-1 py-1">
      <button
        onClick={() => updateQuantity(item.id, qty - 1)}
        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-ink/10 transition-colors"
      >
        <Minus size={14} className="text-ink" />
      </button>
      <span className="text-sm font-semibold text-ink w-4 text-center">{qty}</span>
      <button
        onClick={() => updateQuantity(item.id, qty + 1)}
        className="w-7 h-7 flex items-center justify-center rounded-full bg-brand-400 hover:bg-brand-500 transition-colors"
      >
        <Plus size={14} className="text-white" />
      </button>
    </div>
  )

  /* ── Rich card (image on top) ── */
  if (item.image_url) {
    return (
      <div className={`bg-surface-raised rounded-2xl border border-ink/5 overflow-hidden transition-all duration-200 animate-fade-in ${!item.is_available ? 'opacity-60' : ''}`}>
        {/* Image */}
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-surface-overlay">
          <Image
            src={item.image_url}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 50vw"
          />
          {!item.is_available && (
            <div className="absolute inset-0 bg-ink/40 flex items-center justify-center">
              <span className="text-white text-sm font-semibold bg-ink/60 px-3 py-1 rounded-full">
                Unavailable
              </span>
            </div>
          )}
          {qty > 0 && (
            <div className="absolute top-2 right-2 bg-brand-400 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
              {qty}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <div className="mb-1">{badges}</div>
          <h3 className="font-display text-sm font-semibold text-ink leading-snug">{name}</h3>
          {desc && (
            <p className="text-xs text-ink-muted mt-0.5 line-clamp-2 leading-relaxed">{desc}</p>
          )}
          {showSocialProof && item.order_count > 50 && (
            <div className="flex items-center gap-1 mt-1">
              <Flame size={10} className="text-brand-400" />
              <span className="text-[10px] text-ink-muted">{item.order_count}+ orders today</span>
            </div>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="font-bold text-ink">₹{item.price}</span>
            {addControls}
          </div>
        </div>
      </div>
    )
  }

  /* ── Compact row (no image) ── */
  return (
    <div className={`bg-surface-raised rounded-2xl border border-ink/5 overflow-hidden transition-all duration-200 animate-fade-in ${!item.is_available ? 'opacity-50' : ''}`}>
      <div className="flex gap-3 p-3">
        <div className="flex-1 min-w-0">
          <div className="mb-1.5">{badges}</div>
          <h3 className="font-display text-base font-semibold text-ink leading-tight">{name}</h3>
          {desc && (
            <p className="text-xs text-ink-muted mt-0.5 leading-relaxed line-clamp-2">{desc}</p>
          )}
          {showSocialProof && item.order_count > 50 && (
            <div className="flex items-center gap-1 mt-1.5">
              <Flame size={11} className="text-brand-400" />
              <span className="text-[11px] text-ink-muted">Ordered {item.order_count}+ times today</span>
            </div>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="font-semibold text-ink text-base">₹{item.price}</span>
            {addControls}
          </div>
        </div>
      </div>
    </div>
  )
}
