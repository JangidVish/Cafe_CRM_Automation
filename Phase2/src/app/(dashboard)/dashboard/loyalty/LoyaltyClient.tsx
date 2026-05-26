'use client'
import { useState } from 'react'
import { Loader2, Gift, Coins, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

interface LoyaltyConfig {
  points_per_rupee:     number
  rupees_per_point:     number
  min_points_to_redeem: number
  is_enabled:           boolean
}

interface Props {
  initialConfig:       LoyaltyConfig | null
  totalPointsIssued:   number
  customersWithPoints: number
}

const DEFAULT_CONFIG: LoyaltyConfig = {
  points_per_rupee:     0.1,
  rupees_per_point:     0.5,
  min_points_to_redeem: 50,
  is_enabled:           true,
}

export default function LoyaltyClient({ initialConfig, totalPointsIssued, customersWithPoints }: Props) {
  const [config, setConfig] = useState<LoyaltyConfig>(initialConfig ?? DEFAULT_CONFIG)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/loyalty', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pointsPerRupee:    config.points_per_rupee,
          rupeesPerPoint:    config.rupees_per_point,
          minPointsToRedeem: config.min_points_to_redeem,
          isEnabled:         config.is_enabled,
        }),
      })
      const { error } = await res.json()
      if (error) throw new Error(error)
      toast.success('Loyalty settings saved')
    } catch (err: any) {
      toast.error(err.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const earnExample  = Math.round(100 * config.points_per_rupee)
  const redeemValue  = (50 * config.rupees_per_point).toFixed(0)

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">Loyalty Points</h1>
        <p className="text-ink-muted text-sm mt-0.5">Reward customers for every order</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Points issued',       value: totalPointsIssued.toLocaleString('en-IN'), icon: Coins    },
          { label: 'Customers with pts',  value: customersWithPoints,                       icon: Gift     },
          { label: '50 pts redeems',      value: `₹${redeemValue}`,                         icon: TrendingUp },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-surface-raised rounded-2xl border border-ink/5 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={13} className="text-brand-400" />
              <p className="text-xs text-ink-faint uppercase tracking-wide font-medium">{label}</p>
            </div>
            <p className="font-display text-2xl font-bold text-ink">{value}</p>
          </div>
        ))}
      </div>

      {/* Config */}
      <div className="bg-surface-raised rounded-2xl border border-ink/5 p-6 space-y-6">
        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-ink">Enable loyalty programme</p>
            <p className="text-xs text-ink-muted mt-0.5">Customers earn and redeem points at checkout</p>
          </div>
          <button
            onClick={() => setConfig(c => ({ ...c, is_enabled: !c.is_enabled }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config.is_enabled ? 'bg-brand-400' : 'bg-surface-overlay border border-ink/20'
            }`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              config.is_enabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        <div className={config.is_enabled ? '' : 'opacity-40 pointer-events-none'}>
          {/* Earn rate */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
                Earn rate — points per ₹1 spent
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0.01}
                  max={10}
                  step={0.05}
                  value={config.points_per_rupee}
                  onChange={e => setConfig(c => ({ ...c, points_per_rupee: parseFloat(e.target.value) || 0 }))}
                  className="w-28 text-sm text-ink bg-surface-overlay rounded-xl px-3 py-2 border border-ink/8 focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <p className="text-sm text-ink-muted">
                  = <span className="font-semibold text-ink">{earnExample} pts</span> per ₹100 order
                </p>
              </div>
            </div>

            {/* Redeem rate */}
            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
                Redeem rate — ₹ value per point
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0.01}
                  max={10}
                  step={0.1}
                  value={config.rupees_per_point}
                  onChange={e => setConfig(c => ({ ...c, rupees_per_point: parseFloat(e.target.value) || 0 }))}
                  className="w-28 text-sm text-ink bg-surface-overlay rounded-xl px-3 py-2 border border-ink/8 focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <p className="text-sm text-ink-muted">
                  = <span className="font-semibold text-ink">₹{redeemValue} off</span> per 50 pts
                </p>
              </div>
            </div>

            {/* Minimum points */}
            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
                Minimum points to redeem
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                step={10}
                value={config.min_points_to_redeem}
                onChange={e => setConfig(c => ({ ...c, min_points_to_redeem: parseInt(e.target.value) || 50 }))}
                className="w-28 text-sm text-ink bg-surface-overlay rounded-xl px-3 py-2 border border-ink/8 focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          </div>
        </div>

        {/* Summary box */}
        <div className="bg-brand-50 rounded-xl p-4 text-sm text-brand-700">
          <p className="font-semibold mb-1">How it works</p>
          <ul className="space-y-1 text-xs">
            <li>• Customer spends ₹100 → earns <strong>{earnExample} points</strong></li>
            <li>• When they have ≥{config.min_points_to_redeem} points, they can redeem at checkout</li>
            <li>• {config.min_points_to_redeem} points = <strong>₹{(config.min_points_to_redeem * config.rupees_per_point).toFixed(0)} off</strong></li>
          </ul>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-3 bg-brand-400 hover:bg-brand-500 disabled:opacity-60 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  )
}
