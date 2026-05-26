'use client'
import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import type { MenuCategory } from '@/lib/types'
import toast from 'react-hot-toast'

interface Props {
  mode:    'add' | 'edit'
  cat?:    MenuCategory
  cafeId:  string
  onSave:  (cat: MenuCategory) => void
  onClose: () => void
}

export default function CategoryModal({ mode, cat, cafeId, onSave, onClose }: Props) {
  const [name,   setName]   = useState(cat?.name ?? '')
  const [nameHi, setNameHi] = useState(cat?.name_hi ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleSave() {
    if (!name.trim()) { toast.error('Category name required'); return }
    setSaving(true)
    try {
      let res: Response
      if (mode === 'edit') {
        res = await fetch('/api/menu', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: 'category', categoryId: cat!.id, name: name.trim(), name_hi: nameHi.trim() || null }),
        })
      } else {
        res = await fetch('/api/menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create-category', cafeId, name: name.trim(), name_hi: nameHi.trim() || null }),
        })
      }
      const { data, error } = await res.json()
      if (error) throw new Error(error)
      toast.success(mode === 'edit' ? 'Category updated' : 'Category added')
      onSave(data as MenuCategory)
    } catch (err: any) {
      toast.error(err.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-ink/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="bg-surface-raised rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-lg font-semibold text-ink">
              {mode === 'edit' ? 'Edit category' : 'Add category'}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-surface-overlay text-ink-muted">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
                Name *
              </label>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="e.g. Hot Beverages"
                className="w-full text-sm text-ink bg-surface-overlay rounded-xl px-3 py-2.5 border border-ink/8 focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
                Hindi name (optional)
              </label>
              <input
                value={nameHi}
                onChange={e => setNameHi(e.target.value)}
                placeholder="e.g. गर्म पेय"
                className="w-full text-sm text-ink bg-surface-overlay rounded-xl px-3 py-2.5 border border-ink/8 focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-2xl border border-ink/10 text-sm font-medium text-ink-muted hover:text-ink"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 rounded-2xl bg-brand-400 hover:bg-brand-500 disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Saving…' : mode === 'edit' ? 'Save' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
