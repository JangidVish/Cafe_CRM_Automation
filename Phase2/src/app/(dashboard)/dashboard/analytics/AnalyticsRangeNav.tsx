'use client'
import { useRouter, useSearchParams } from 'next/navigation'

const RANGES = [
  { label: '7 days',  value: 7  },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
]

export default function AnalyticsRangeNav({ current }: { current: number }) {
  const router = useRouter()
  const params = useSearchParams()

  function setRange(v: number) {
    const p = new URLSearchParams(params.toString())
    p.set('range', String(v))
    router.push(`/dashboard/analytics?${p.toString()}`)
  }

  return (
    <div className="flex gap-1 bg-surface-overlay rounded-xl p-1">
      {RANGES.map(r => (
        <button
          key={r.value}
          onClick={() => setRange(r.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            current === r.value
              ? 'bg-brand-400 text-white shadow-sm'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}
