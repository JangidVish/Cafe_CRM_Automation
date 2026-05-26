'use client'
import { useState } from 'react'
import { Plus, Pencil, Trash2, Eye, EyeOff, Star } from 'lucide-react'
import type { MenuCategory, MenuItem } from '@/lib/types'
import toast from 'react-hot-toast'
import dynamic from 'next/dynamic'

const ItemDrawer    = dynamic(() => import('./ItemDrawer'),    { ssr: false })
const CategoryModal = dynamic(() => import('./CategoryModal'), { ssr: false })

interface Props { initialCategories: MenuCategory[]; cafeId: string }

type DrawerState = { mode: 'add'; catId: string } | { mode: 'edit'; item: MenuItem }
type CatModalState = { mode: 'add' } | { mode: 'edit'; cat: MenuCategory }

export default function MenuManagerClient({ initialCategories, cafeId }: Props) {
  const [categories,   setCategories]   = useState<MenuCategory[]>(initialCategories)
  const [activeCatId,  setActiveCatId]  = useState<string>(initialCategories[0]?.id ?? '')
  const [drawer,       setDrawer]       = useState<DrawerState | null>(null)
  const [catModal,     setCatModal]     = useState<CatModalState | null>(null)
  const [deletingId,   setDeletingId]   = useState<string | null>(null)
  const [togglingId,   setTogglingId]   = useState<string | null>(null)

  const activeCat    = categories.find(c => c.id === activeCatId)
  const totalItems   = categories.reduce((s, c) => s + (c.items?.length ?? 0), 0)
  const totalCats    = categories.length
  const unavailable  = categories.reduce((s, c) => s + (c.items ?? []).filter(i => !i.is_available).length, 0)

  // ── Category saved (add or edit) ─────────────────────────────
  function handleCatSaved(cat: MenuCategory) {
    setCategories(prev => {
      const exists = prev.find(c => c.id === cat.id)
      if (exists) return prev.map(c => c.id === cat.id ? { ...c, ...cat } : c)
      const newCat = { ...cat, items: [] }
      return [...prev, newCat]
    })
    setActiveCatId(cat.id)
    setCatModal(null)
  }

  // ── Delete category ──────────────────────────────────────────
  async function deleteCategory(cat: MenuCategory) {
    if (!confirm(`Delete category "${cat.name}" and all its items? This cannot be undone.`)) return
    setDeletingId(cat.id)
    try {
      const res = await fetch('/api/menu', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'category', categoryId: cat.id }),
      })
      const { error } = await res.json()
      if (error) throw new Error(error)
      setCategories(prev => prev.filter(c => c.id !== cat.id))
      const remaining = categories.filter(c => c.id !== cat.id)
      setActiveCatId(remaining[0]?.id ?? '')
      toast.success('Category deleted')
    } catch (err: any) {
      toast.error(err.message ?? 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  // ── Item saved (add or edit) ─────────────────────────────────
  function handleItemSaved(savedItem: MenuItem) {
    setCategories(prev => prev.map(cat => {
      if (cat.id !== savedItem.category_id) return cat
      const exists = (cat.items ?? []).find(i => i.id === savedItem.id)
      return {
        ...cat,
        items: exists
          ? (cat.items ?? []).map(i => i.id === savedItem.id ? savedItem : i)
          : [...(cat.items ?? []), savedItem],
      }
    }))
    setDrawer(null)
  }

  // ── Delete item ──────────────────────────────────────────────
  async function deleteItem(item: MenuItem) {
    if (!confirm(`Delete "${item.name}"?`)) return
    setDeletingId(item.id)
    try {
      const res = await fetch('/api/menu', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'item', itemId: item.id }),
      })
      const { error } = await res.json()
      if (error) throw new Error(error)
      setCategories(prev => prev.map(cat => ({
        ...cat,
        items: (cat.items ?? []).filter(i => i.id !== item.id),
      })))
      toast.success(`${item.name} deleted`)
    } catch (err: any) {
      toast.error(err.message ?? 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  // ── Toggle availability ──────────────────────────────────────
  async function toggleAvailability(item: MenuItem) {
    setTogglingId(item.id)
    try {
      const res = await fetch('/api/menu', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'item', itemId: item.id, is_available: !item.is_available }),
      })
      const { data, error } = await res.json()
      if (error) throw new Error(error)
      handleItemSaved(data as MenuItem)
    } catch {
      toast.error('Update failed')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="flex h-full min-h-screen">

      {/* ── Left sidebar: Categories ─────────────────────────── */}
      <aside className="w-56 shrink-0 bg-surface-raised border-r border-ink/5 flex flex-col">
        <div className="px-4 py-4 border-b border-ink/5">
          <h1 className="font-display font-bold text-ink text-base">Menu Manager</h1>
          <p className="text-xs text-ink-faint mt-0.5">{totalItems} items · {totalCats} categories</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {categories.map(cat => (
            <div
              key={cat.id}
              className={`group flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                activeCatId === cat.id
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-ink-muted hover:bg-surface-overlay hover:text-ink'
              }`}
              onClick={() => setActiveCatId(cat.id)}
            >
              <span className="flex-1 text-sm font-medium truncate">{cat.name}</span>
              <span className="text-xs text-ink-faint shrink-0">{cat.items?.length ?? 0}</span>

              {/* Edit/delete on hover */}
              <div className="hidden group-hover:flex gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setCatModal({ mode: 'edit', cat })}
                  className="p-1 rounded hover:bg-surface-overlay text-ink-faint hover:text-ink-muted"
                >
                  <Pencil size={11} />
                </button>
                <button
                  onClick={() => deleteCategory(cat)}
                  disabled={deletingId === cat.id}
                  className="p-1 rounded hover:bg-red-50 text-ink-faint hover:text-red-500"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-ink/5">
          <button
            onClick={() => setCatModal({ mode: 'add' })}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-ink-muted hover:text-ink hover:bg-surface-overlay transition-colors"
          >
            <Plus size={14} />
            Add category
          </button>
        </div>
      </aside>

      {/* ── Right: Items grid ────────────────────────────────── */}
      <main className="flex-1 overflow-auto p-6">
        {/* Stats + add button */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">
              {activeCat?.name ?? 'Select a category'}
            </h2>
            <p className="text-ink-muted text-sm mt-0.5">
              {activeCat ? `${activeCat.items?.length ?? 0} items · ${unavailable} unavailable` : ''}
            </p>
          </div>
          {activeCat && (
            <button
              onClick={() => setDrawer({ mode: 'add', catId: activeCatId })}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-400 hover:bg-brand-500 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Plus size={15} />
              Add item
            </button>
          )}
        </div>

        {/* Items grid */}
        {!activeCat ? (
          <div className="flex items-center justify-center h-64 text-ink-faint text-sm">
            Select a category from the left
          </div>
        ) : (activeCat.items ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <p className="text-ink-faint text-sm">No items yet in this category</p>
            <button
              onClick={() => setDrawer({ mode: 'add', catId: activeCatId })}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-brand-400 text-brand-600 text-sm font-medium hover:bg-brand-50 transition-colors"
            >
              <Plus size={14} />
              Add first item
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(activeCat.items ?? [])
              .sort((a, b) => a.sort_order - b.sort_order)
              .map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  isDeleting={deletingId === item.id}
                  isToggling={togglingId === item.id}
                  onEdit={() => setDrawer({ mode: 'edit', item })}
                  onDelete={() => deleteItem(item)}
                  onToggle={() => toggleAvailability(item)}
                />
              ))}
          </div>
        )}
      </main>

      {/* ── Drawer ───────────────────────────────────────────── */}
      {drawer && (
        <ItemDrawer
          mode={drawer.mode}
          item={drawer.mode === 'edit' ? drawer.item : undefined}
          categoryId={drawer.mode === 'add' ? drawer.catId : drawer.item.category_id}
          categories={categories}
          cafeId={cafeId}
          onSave={handleItemSaved}
          onClose={() => setDrawer(null)}
        />
      )}

      {/* ── Category modal ───────────────────────────────────── */}
      {catModal && (
        <CategoryModal
          mode={catModal.mode}
          cat={catModal.mode === 'edit' ? catModal.cat : undefined}
          cafeId={cafeId}
          onSave={handleCatSaved}
          onClose={() => setCatModal(null)}
        />
      )}
    </div>
  )
}

// ── Item card ─────────────────────────────────────────────────
function ItemCard({
  item, isDeleting, isToggling, onEdit, onDelete, onToggle,
}: {
  item:       MenuItem
  isDeleting: boolean
  isToggling: boolean
  onEdit:     () => void
  onDelete:   () => void
  onToggle:   () => void
}) {
  return (
    <div className={`bg-surface-raised rounded-2xl border border-ink/5 overflow-hidden flex flex-col transition-opacity ${
      !item.is_available ? 'opacity-60' : ''
    }`}>
      {/* Image */}
      {item.image_url ? (
        <div className="aspect-video w-full overflow-hidden bg-surface-overlay shrink-0">
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="aspect-video w-full bg-surface-overlay flex items-center justify-center shrink-0">
          <span className="text-2xl">🍽️</span>
        </div>
      )}

      <div className="p-4 flex flex-col flex-1">
        {/* Name + badges */}
        <div className="flex items-start gap-2 mb-1">
          <span
            className="w-3 h-3 rounded-sm border-2 mt-0.5 shrink-0"
            style={{ borderColor: item.is_veg ? '#22C55E' : '#EF4444' }}
          />
          <p className="text-sm font-semibold text-ink leading-tight flex-1">{item.name}</p>
          {item.is_featured && <Star size={13} className="text-yellow-400 fill-yellow-400 shrink-0" />}
        </div>

        {item.description && (
          <p className="text-xs text-ink-faint line-clamp-2 mb-2 ml-5">{item.description}</p>
        )}

        <div className="flex items-center justify-between mt-auto">
          <span className="font-bold text-ink">₹{item.price}</span>
          <div className="flex gap-1">
            <button
              onClick={onToggle}
              disabled={isToggling}
              title={item.is_available ? 'Mark unavailable' : 'Mark available'}
              className="p-1.5 rounded-lg hover:bg-surface-overlay text-ink-faint hover:text-ink-muted transition-colors disabled:opacity-40"
            >
              {item.is_available ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg hover:bg-surface-overlay text-ink-faint hover:text-ink-muted transition-colors"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="p-1.5 rounded-lg hover:bg-red-50 text-ink-faint hover:text-red-500 transition-colors disabled:opacity-40"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
