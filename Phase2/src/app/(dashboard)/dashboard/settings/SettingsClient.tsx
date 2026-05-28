'use client'
import { useState } from 'react'
import { Plus, Trash2, Loader2, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface PromoCode {
  code: string
  type: 'percent' | 'flat'
  value: number
  active: boolean
}

interface Props {
  cafeId: string
  serviceChargePercent: number
  taxPercent: number
  promoCodes: PromoCode[]
  city: string
}

export default function SettingsClient({ cafeId, serviceChargePercent, taxPercent, promoCodes: initial, city: initialCity }: Props) {
  const [svcCharge, setSvcCharge]   = useState(serviceChargePercent)
  const [taxPct, setTaxPct]         = useState(taxPercent)
  const [city, setCity]             = useState(initialCity)
  const [savingGeneral, setSavingGeneral] = useState(false)

  const [promos, setPromos]         = useState<PromoCode[]>(initial)
  const [savingPromos, setSavingPromos] = useState(false)
  const [newPromo, setNewPromo]     = useState<PromoCode>({ code: '', type: 'percent', value: 10, active: true })

  async function saveGeneral() {
    setSavingGeneral(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_charge_percent: svcCharge, tax_percent: taxPct, city: city.trim() || null }),
      })
      const { error } = await res.json()
      if (error) throw new Error(error)
      toast.success('Settings saved')
    } catch (err: any) {
      toast.error(err.message ?? 'Save failed')
    } finally {
      setSavingGeneral(false)
    }
  }

  async function savePromos(updated: PromoCode[]) {
    setSavingPromos(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promo_codes: updated }),
      })
      const { error } = await res.json()
      if (error) throw new Error(error)
      setPromos(updated)
      toast.success('Promo codes saved')
    } catch (err: any) {
      toast.error(err.message ?? 'Save failed')
    } finally {
      setSavingPromos(false)
    }
  }

  function addPromo() {
    const code = newPromo.code.trim().toUpperCase()
    if (!code) { toast.error('Enter a code'); return }
    if (promos.some(p => p.code === code)) { toast.error('Code already exists'); return }
    const updated = [...promos, { ...newPromo, code }]
    setNewPromo({ code: '', type: 'percent', value: 10, active: true })
    savePromos(updated)
  }

  function removePromo(code: string) {
    savePromos(promos.filter(p => p.code !== code))
  }

  function togglePromo(code: string) {
    savePromos(promos.map(p => p.code === code ? { ...p, active: !p.active } : p))
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Settings</h1>
        <p className="text-ink-muted text-sm mt-0.5">Charges, taxes, and promotions</p>
      </div>

      {/* Charges */}
      <div className="bg-surface-raised rounded-2xl border border-ink/5 p-5 space-y-4">
        <h2 className="font-display font-semibold text-ink">Taxes & charges</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide block mb-1.5">
              GST / Tax %
            </label>
            <div className="flex items-center gap-2 border border-ink/10 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-brand-400">
              <input
                type="number"
                min={0}
                max={30}
                value={taxPct}
                onChange={e => setTaxPct(Number(e.target.value))}
                className="w-full text-sm text-ink bg-transparent focus:outline-none"
              />
              <span className="text-sm text-ink-faint">%</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide block mb-1.5">
              Service charge %
            </label>
            <div className="flex items-center gap-2 border border-ink/10 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-brand-400">
              <input
                type="number"
                min={0}
                max={30}
                value={svcCharge}
                onChange={e => setSvcCharge(Number(e.target.value))}
                className="w-full text-sm text-ink bg-transparent focus:outline-none"
              />
              <span className="text-sm text-ink-faint">%</span>
            </div>
            <p className="text-[11px] text-ink-faint mt-1">Set 0 to disable service charge</p>
          </div>
        </div>

        {/* City for weather */}
        <div>
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide block mb-1.5">
            City (for weather suggestions on menu)
          </label>
          <input
            type="text"
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="e.g. Mumbai, Delhi, Bangalore"
            className="w-full border border-ink/10 rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <p className="text-[11px] text-ink-faint mt-1">Requires OPENWEATHER_API_KEY in .env</p>
        </div>

        <button
          onClick={saveGeneral}
          disabled={savingGeneral}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-400 text-white text-sm font-semibold rounded-xl hover:bg-brand-500 disabled:opacity-60 transition-colors"
        >
          {savingGeneral ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          Save charges
        </button>
      </div>

      {/* Promo codes */}
      <div className="bg-surface-raised rounded-2xl border border-ink/5 p-5 space-y-4">
        <h2 className="font-display font-semibold text-ink">Promo codes</h2>

        {/* Add new */}
        <div className="flex flex-wrap gap-2 items-end p-3 bg-surface-overlay rounded-xl border border-ink/5">
          <div className="flex-1 min-w-28">
            <label className="text-[11px] text-ink-faint uppercase tracking-wide block mb-1">Code</label>
            <input
              type="text"
              value={newPromo.code}
              onChange={e => setNewPromo(p => ({ ...p, code: e.target.value.toUpperCase() }))}
              placeholder="SAVE10"
              className="w-full text-sm border border-ink/10 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-surface uppercase"
            />
          </div>
          <div>
            <label className="text-[11px] text-ink-faint uppercase tracking-wide block mb-1">Type</label>
            <select
              value={newPromo.type}
              onChange={e => setNewPromo(p => ({ ...p, type: e.target.value as 'percent' | 'flat' }))}
              className="text-sm border border-ink/10 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-surface"
            >
              <option value="percent">Percent %</option>
              <option value="flat">Flat ₹</option>
            </select>
          </div>
          <div className="w-24">
            <label className="text-[11px] text-ink-faint uppercase tracking-wide block mb-1">Value</label>
            <input
              type="number"
              min={1}
              value={newPromo.value}
              onChange={e => setNewPromo(p => ({ ...p, value: Number(e.target.value) }))}
              className="w-full text-sm border border-ink/10 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-surface"
            />
          </div>
          <button
            onClick={addPromo}
            disabled={savingPromos}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-400 text-white text-xs font-semibold rounded-xl hover:bg-brand-500 disabled:opacity-60"
          >
            {savingPromos ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Add
          </button>
        </div>

        {/* List */}
        {promos.length === 0 ? (
          <p className="text-sm text-ink-faint text-center py-4">No promo codes yet</p>
        ) : (
          <div className="space-y-2">
            {promos.map(p => (
              <div key={p.code} className="flex items-center gap-3 py-2 border-b border-ink/5 last:border-0">
                <button
                  onClick={() => togglePromo(p.code)}
                  className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${p.active ? 'bg-brand-400' : 'bg-ink/20'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${p.active ? 'left-4' : 'left-0.5'}`} />
                </button>
                <span className="font-mono text-sm font-bold text-ink flex-1">{p.code}</span>
                <span className="text-sm text-ink-muted">
                  {p.type === 'percent' ? `${p.value}% off` : `₹${p.value} off`}
                </span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {p.active ? 'Active' : 'Paused'}
                </span>
                <button
                  onClick={() => removePromo(p.code)}
                  className="p-1 text-ink-faint hover:text-red-500 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
