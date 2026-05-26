'use client'
import { useState, useEffect } from 'react'
import { X, Loader2, Users } from 'lucide-react'
import toast from 'react-hot-toast'

const SEGMENTS = [
  { value: 'all',     label: 'All customers',  desc: 'Everyone who has placed an order' },
  { value: 'vip',     label: 'VIP',            desc: '₹5,000+ spent or 20+ orders' },
  { value: 'regular', label: 'Regular',        desc: '3+ orders' },
  { value: 'lapsed',  label: 'Lapsed',         desc: 'No visit in 30+ days' },
]

interface Props {
  cafeId: string
  segmentCounts: { all: number; vip: number; regular: number; lapsed: number } & Record<string, number>
  onSave: (campaign: any) => void
  onClose: () => void
}

export default function CampaignDrawer({ cafeId, segmentCounts, onSave, onClose }: Props) {
  const [name,    setName]    = useState('')
  const [segment, setSegment] = useState('all')
  const [message, setMessage] = useState('')
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleSave() {
    if (!name.trim()) { toast.error('Campaign name required'); return }
    if (!message.trim()) { toast.error('Message required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), segment, message: message.trim() }),
      })
      const { data, error } = await res.json()
      if (error) throw new Error(error)
      onSave(data)
    } catch (err: any) {
      toast.error(err.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const recipientCount = segmentCounts[segment] ?? 0

  return (
    <>
      <div className="fixed inset-0 bg-ink/40 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-surface-raised shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-ink/5">
          <h2 className="font-display text-lg font-semibold text-ink">New campaign</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-surface-overlay text-ink-muted">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
              Campaign name *
            </label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Weekend Special Offer"
              className="w-full text-sm text-ink bg-surface-overlay rounded-xl px-3 py-2.5 border border-ink/8 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>

          {/* Segment */}
          <div>
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
              Target segment *
            </label>
            <div className="space-y-2">
              {SEGMENTS.map(s => (
                <label key={s.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  segment === s.value ? 'border-brand-400 bg-brand-50' : 'border-ink/8 hover:border-ink/15'
                }`}>
                  <input
                    type="radio"
                    name="segment"
                    value={s.value}
                    checked={segment === s.value}
                    onChange={() => setSegment(s.value)}
                    className="accent-brand-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink">{s.label}</p>
                    <p className="text-xs text-ink-muted">{s.desc}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-ink-muted shrink-0">
                    <Users size={11} />
                    {segmentCounts[s.value] ?? 0}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
              Message *
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={`Hi {name},\n\nWe miss you! Come visit us this weekend and enjoy 10% off your next order.`}
              rows={6}
              className="w-full text-sm text-ink bg-surface-overlay rounded-xl px-3 py-2.5 resize-none border border-ink/8 focus:outline-none focus:ring-2 focus:ring-brand-400 font-mono"
            />
            <p className="text-[11px] text-ink-faint mt-1">
              Use <code className="bg-surface-overlay px-1 rounded">{'{name}'}</code> for personalisation.
              WhatsApp markdown: *bold*, _italic_
            </p>
          </div>

          {/* Preview */}
          {message && (
            <div>
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">Preview</p>
              <div className="bg-[#ECE5DD] rounded-2xl p-4">
                <div className="bg-white rounded-xl rounded-tl-none px-3 py-2 max-w-xs shadow-sm">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {message.replace(/\{name\}/g, 'Priya')}
                  </p>
                  <p className="text-[10px] text-gray-400 text-right mt-1">10:30 AM ✓✓</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-ink/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-ink-muted flex items-center gap-1">
              <Users size={11} />
              {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-ink-faint">{message.length} chars</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-ink/10 text-sm font-medium text-ink-muted hover:text-ink"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-brand-400 hover:bg-brand-500 disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Creating…' : 'Create draft'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
