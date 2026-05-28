'use client'
import { useState, useRef, useEffect } from 'react'
import { X, Upload, Loader2, Flame, Sparkles } from 'lucide-react'
import type { MenuItem, MenuCategory } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Props {
  mode:       'add' | 'edit'
  item?:      MenuItem
  categoryId: string
  categories: MenuCategory[]
  cafeId:     string
  onSave:     (item: MenuItem) => void
  onClose:    () => void
}

const SPICE_LABELS = ['None', 'Mild', 'Medium', 'Hot']
const SPICE_COLORS = ['text-ink-faint', 'text-yellow-500', 'text-orange-500', 'text-red-500']

async function uploadImage(file: File, cafeId: string): Promise<string | null> {
  const supabase = createClient()
  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = `${cafeId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('menu-images')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) { toast.error(`Image upload failed: ${error.message}`); return null }

  return supabase.storage.from('menu-images').getPublicUrl(path).data.publicUrl
}

export default function ItemDrawer({ mode, item, categoryId, categories, cafeId, onSave, onClose }: Props) {
  const [name,        setName]        = useState(item?.name ?? '')
  const [nameHi,      setNameHi]      = useState(item?.name_hi ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [price,       setPrice]       = useState(item?.price?.toString() ?? '')
  const [catId,       setCatId]       = useState(item?.category_id ?? categoryId)
  const [isVeg,       setIsVeg]       = useState(item?.is_veg ?? true)
  const [isFeatured,  setIsFeatured]  = useState(item?.is_featured ?? false)
  const [isAvailable, setIsAvailable] = useState(item?.is_available ?? true)
  const [spiceLevel,  setSpiceLevel]  = useState<0|1|2|3>(item?.spice_level ?? 0)
  const [prepTime,    setPrepTime]    = useState(item?.prep_time_mins?.toString() ?? '10')
  const [imagePreview,setImagePreview]= useState<string | null>(item?.image_url ?? null)
  const [imageFile,   setImageFile]   = useState<File | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [enhancing,   setEnhancing]   = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  // Trap focus inside drawer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function enhanceDescription() {
    if (!name.trim()) { toast.error('Enter item name first'); return }
    setEnhancing(true)
    try {
      const catName = categories.find(c => c.id === catId)?.name ?? ''
      const res = await fetch('/api/menu/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description, category: catName }),
      })
      const { data, error } = await res.json()
      if (error) throw new Error(error)
      setDescription(data.description)
      toast.success('Description enhanced!')
    } catch (err: any) {
      toast.error(err.message ?? 'AI enhance failed')
    } finally {
      setEnhancing(false)
    }
  }

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!name.trim())       { toast.error('Name required'); return }
    if (!price || isNaN(+price) || +price <= 0) { toast.error('Valid price required'); return }

    setSaving(true)
    try {
      let imageUrl = item?.image_url ?? null
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, cafeId)
        if (!imageUrl) { setSaving(false); return }
      }

      const payload: Record<string, unknown> = {
        name:          name.trim(),
        name_hi:       nameHi.trim() || null,
        description:   description.trim() || null,
        price:         parseFloat(price),
        category_id:   catId,
        image_url:     imageUrl,
        is_veg:        isVeg,
        is_featured:   isFeatured,
        is_available:  isAvailable,
        spice_level:   spiceLevel,
        prep_time_mins: parseInt(prepTime) || 10,
      }

      let res: Response
      if (mode === 'edit') {
        res = await fetch('/api/menu', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: 'item', itemId: item!.id, ...payload }),
        })
      } else {
        res = await fetch('/api/menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create-item', cafeId, categoryId: catId, ...payload }),
        })
      }

      const { data, error } = await res.json()
      if (error) throw new Error(error)
      toast.success(mode === 'edit' ? 'Item updated' : 'Item added')
      onSave(data as MenuItem)
    } catch (err: any) {
      toast.error(err.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-ink/40 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-surface-raised shadow-2xl flex flex-col animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink/5 shrink-0">
          <h2 className="font-display text-lg font-semibold text-ink">
            {mode === 'edit' ? 'Edit item' : 'Add item'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-surface-overlay text-ink-muted">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Image upload */}
          <div>
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
              Dish photo
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className="relative w-full h-40 rounded-2xl border-2 border-dashed border-ink/15 hover:border-brand-400 transition-colors cursor-pointer overflow-hidden bg-surface-overlay flex items-center justify-center group"
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload size={24} className="text-white" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-ink-faint group-hover:text-ink-muted transition-colors">
                  <Upload size={24} />
                  <span className="text-sm">Click to upload photo</span>
                  <span className="text-xs">JPG, PNG — max 5 MB</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFilePick} />
          </div>

          {/* Name */}
          <Field label="Item name *">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Masala Chai"
              className={inputCls}
            />
          </Field>

          {/* Name Hindi */}
          <Field label="Hindi name (optional)">
            <input
              value={nameHi}
              onChange={e => setNameHi(e.target.value)}
              placeholder="e.g. मसाला चाय"
              className={inputCls}
            />
          </Field>

          {/* Price */}
          <Field label="Price (₹) *">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm">₹</span>
              <input
                type="number"
                min={0}
                step={0.5}
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="0"
                className={`${inputCls} pl-7`}
              />
            </div>
          </Field>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Description</label>
              <button
                type="button"
                onClick={enhanceDescription}
                disabled={enhancing || !name.trim()}
                className="flex items-center gap-1 text-[11px] font-semibold text-brand-500 hover:text-brand-600 disabled:opacity-40 transition-colors"
              >
                {enhancing ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                {enhancing ? 'Enhancing…' : 'Enhance with AI'}
              </button>
            </div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What makes this special?"
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Category */}
          <Field label="Category">
            <select value={catId} onChange={e => setCatId(e.target.value)} className={inputCls}>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          {/* Prep time */}
          <Field label="Prep time (minutes)">
            <input
              type="number"
              min={1}
              value={prepTime}
              onChange={e => setPrepTime(e.target.value)}
              className={inputCls}
            />
          </Field>

          {/* Veg / Non-veg */}
          <div className="flex gap-3">
            <Toggle label="Veg" on={isVeg} onChange={setIsVeg} colorOn="bg-green-500" />
            <Toggle label="Featured" on={isFeatured} onChange={setIsFeatured} colorOn="bg-brand-400" />
            <Toggle label="Available" on={isAvailable} onChange={setIsAvailable} colorOn="bg-blue-500" />
          </div>

          {/* Spice level */}
          <div>
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
              Spice level
            </label>
            <div className="flex gap-2">
              {([0,1,2,3] as const).map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSpiceLevel(lvl)}
                  className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                    spiceLevel === lvl
                      ? 'border-brand-400 bg-brand-50 text-brand-700'
                      : 'border-ink/10 text-ink-muted hover:border-ink/20'
                  }`}
                >
                  {lvl > 0 && <Flame size={11} className={SPICE_COLORS[lvl]} />}
                  {SPICE_LABELS[lvl]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="shrink-0 px-5 py-4 border-t border-ink/5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-ink/10 text-sm font-medium text-ink-muted hover:text-ink transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-2xl bg-brand-400 hover:bg-brand-500 disabled:opacity-60 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Add item'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Helpers ───────────────────────────────────────────────────
const inputCls = 'w-full text-sm text-ink bg-surface-overlay rounded-xl px-3 py-2.5 border border-ink/8 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

function Toggle({
  label, on, onChange, colorOn,
}: { label: string; on: boolean; onChange: (v: boolean) => void; colorOn: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
        on ? `${colorOn} text-white border-transparent` : 'border-ink/10 text-ink-muted'
      }`}
    >
      {label}
    </button>
  )
}
