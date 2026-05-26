'use client'
import { useState, useMemo } from 'react'
import type { Customer } from '@/lib/types'
import { Search, ChevronDown, ChevronUp, Pencil, Check, X, Download, Tags, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const ALL_TAGS = ['vip', 'regular', 'lapsed'] as const
type CustomerTag = typeof ALL_TAGS[number]

const TAG_STYLES: Record<CustomerTag, string> = {
  vip:     'bg-yellow-100 text-yellow-700 border-yellow-200',
  regular: 'bg-green-100 text-green-700 border-green-200',
  lapsed:  'bg-gray-100 text-gray-500 border-gray-200',
}

const LTV_TIERS = [
  { label: 'Platinum', min: 20000, color: 'bg-purple-100 text-purple-700' },
  { label: 'Gold',     min: 5000,  color: 'bg-yellow-100 text-yellow-700' },
  { label: 'Silver',   min: 1000,  color: 'bg-slate-100 text-slate-600'   },
  { label: 'Bronze',   min: 0,     color: 'bg-amber-50 text-amber-700'    },
]

function getLtvTier(spent: number) {
  return LTV_TIERS.find(t => spent >= t.min) ?? LTV_TIERS[LTV_TIERS.length - 1]
}

interface RecentOrder {
  id: string
  order_number: string
  total_amount: number
  status: string
  created_at: string
}

interface Props {
  initialCustomers: Customer[]
  ordersByCustomer: Record<string, RecentOrder[]>
}

function maskPhone(phone: string) {
  if (phone.length <= 4) return phone
  return phone.slice(0, -4).replace(/\d/g, '•') + phone.slice(-4)
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function CustomersClient({ initialCustomers, ordersByCustomer }: Props) {
  const [customers, setCustomers]   = useState<Customer[]>(initialCustomers)
  const [search, setSearch]         = useState('')
  const [tagFilter, setTagFilter]   = useState<CustomerTag | 'all'>('all')
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editName, setEditName]     = useState('')
  const [saving, setSaving]         = useState<string | null>(null)
  const [autoTagging, setAutoTagging] = useState(false)

  const filtered = useMemo(() => {
    return customers.filter(c => {
      const matchSearch = !search || c.phone.includes(search) || (c.name ?? '').toLowerCase().includes(search.toLowerCase())
      const matchTag    = tagFilter === 'all' || c.tags.includes(tagFilter)
      return matchSearch && matchTag
    })
  }, [customers, search, tagFilter])

  const totalCustomers = customers.length
  const newThisWeek    = customers.filter(c => c.created_at && Date.now() - new Date(c.created_at).getTime() < 7 * 86400_000).length
  const vipCount       = customers.filter(c => c.tags.includes('vip')).length

  async function saveName(customerId: string) {
    setSaving(customerId)
    try {
      const res = await fetch('/api/customers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, name: editName }),
      })
      const { data, error } = await res.json()
      if (error) throw new Error(error)
      setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, name: data.name } : c))
      setEditingId(null)
      toast.success('Name saved')
    } catch {
      toast.error('Could not save name')
    } finally {
      setSaving(null)
    }
  }

  async function toggleTag(customerId: string, tag: CustomerTag) {
    const customer = customers.find(c => c.id === customerId)
    if (!customer) return
    const has     = customer.tags.includes(tag)
    const newTags = has ? customer.tags.filter(t => t !== tag) : [...customer.tags, tag]
    setSaving(customerId)
    try {
      const res = await fetch('/api/customers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, tags: newTags }),
      })
      const { data, error } = await res.json()
      if (error) throw new Error(error)
      setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, tags: data.tags } : c))
    } catch {
      toast.error('Could not update tag')
    } finally {
      setSaving(null)
    }
  }

  async function runAutoTag() {
    setAutoTagging(true)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto-tag' }),
      })
      const { data, error } = await res.json()
      if (error) throw new Error(error)
      // Refresh customer list
      const listRes = await fetch('/api/customers')
      const { data: fresh } = await listRes.json()
      if (fresh) setCustomers(fresh)
      toast.success(`${data.count} customers tagged`)
    } catch (err: any) {
      toast.error(err.message ?? 'Auto-tag failed')
    } finally {
      setAutoTagging(false)
    }
  }

  function exportCsv() {
    window.location.href = '/api/customers/export'
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Customers</h1>
          <p className="text-ink-muted text-sm mt-0.5">CRM — all customers who shared their number</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={runAutoTag}
            disabled={autoTagging}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-ink/10 rounded-xl hover:border-ink/20 text-ink-muted hover:text-ink transition-colors disabled:opacity-50"
          >
            {autoTagging ? <Loader2 size={12} className="animate-spin" /> : <Tags size={12} />}
            Auto-tag
          </button>
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-ink/10 rounded-xl hover:border-ink/20 text-ink-muted hover:text-ink transition-colors"
          >
            <Download size={12} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total customers', value: totalCustomers },
          { label: 'New this week',   value: newThisWeek   },
          { label: 'VIP',             value: vipCount      },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface-raised rounded-2xl border border-ink/5 p-4">
            <p className="text-xs text-ink-faint uppercase tracking-wide font-medium">{label}</p>
            <p className="font-display text-3xl font-bold text-ink mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 bg-surface-raised border border-ink/10 rounded-xl px-3 py-2 flex-1 min-w-48">
          <Search size={15} className="text-ink-faint shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or phone…"
            className="bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none flex-1"
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', ...ALL_TAGS] as const).map(t => (
            <button
              key={t}
              onClick={() => setTagFilter(t)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border capitalize transition-colors ${
                tagFilter === t
                  ? 'bg-brand-400 text-white border-brand-400'
                  : 'bg-surface-raised text-ink-muted border-ink/10 hover:border-ink/20'
              }`}
            >
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-surface-raised rounded-2xl border border-ink/5 p-12 text-center">
          <p className="text-ink-muted text-sm">No customers yet — they appear when a phone number is entered at checkout.</p>
        </div>
      ) : (
        <div className="bg-surface-raised rounded-2xl border border-ink/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/5">
                {['Customer', 'Tier', 'Orders', 'Spent', 'Points', 'Last Visit', 'Tags', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-ink-faint uppercase tracking-wide px-4 py-3 first:pl-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(customer => {
                const isExpanded = expanded === customer.id
                const isEditing  = editingId === customer.id
                const isSaving   = saving === customer.id
                const recentOrders = ordersByCustomer[customer.id] ?? []
                const tier = getLtvTier(customer.total_spent)

                return (
                  <>
                    <tr
                      key={customer.id}
                      className="border-b border-ink/5 last:border-0 hover:bg-surface-overlay/50 transition-colors"
                    >
                      {/* Customer name + phone */}
                      <td className="px-4 py-3 pl-5">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              autoFocus
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveName(customer.id)
                                if (e.key === 'Escape') setEditingId(null)
                              }}
                              className="text-sm border border-brand-400 rounded-lg px-2 py-0.5 focus:outline-none w-32"
                            />
                            <button onClick={() => saveName(customer.id)} disabled={isSaving} className="p-0.5 text-green-600 hover:text-green-700">
                              <Check size={14} />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-0.5 text-ink-faint hover:text-ink-muted">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 group">
                            <div>
                              <p className="font-medium text-ink">
                                {customer.name ?? <span className="text-ink-faint italic">No name</span>}
                              </p>
                              <p className="text-xs text-ink-faint">+91 {maskPhone(customer.phone)}</p>
                            </div>
                            <button
                              onClick={() => { setEditingId(customer.id); setEditName(customer.name ?? '') }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-ink-faint hover:text-ink-muted transition-opacity"
                            >
                              <Pencil size={12} />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* LTV Tier badge */}
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${tier.color}`}>
                          {tier.label}
                        </span>
                      </td>

                      {/* Orders */}
                      <td className="px-4 py-3 text-ink font-semibold">{customer.total_orders}</td>

                      {/* Spent */}
                      <td className="px-4 py-3 text-ink font-semibold">₹{Math.round(customer.total_spent)}</td>

                      {/* Points */}
                      <td className="px-4 py-3 text-ink-muted text-xs font-medium">
                        {(customer.points_balance ?? 0) > 0
                          ? <span className="text-brand-600 font-semibold">{customer.points_balance} pts</span>
                          : '—'
                        }
                      </td>

                      {/* Last visit */}
                      <td className="px-4 py-3 text-ink-muted">{formatDate(customer.last_visit_at)}</td>

                      {/* Tags */}
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {ALL_TAGS.map(tag => {
                            const active = customer.tags.includes(tag)
                            return (
                              <button
                                key={tag}
                                onClick={() => toggleTag(customer.id, tag)}
                                disabled={isSaving}
                                className={`text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize transition-colors ${
                                  active ? TAG_STYLES[tag] : 'border-ink/10 text-ink-faint hover:border-ink/20'
                                }`}
                              >
                                {tag}
                              </button>
                            )
                          })}
                        </div>
                      </td>

                      {/* Expand toggle */}
                      <td className="px-4 py-3">
                        {recentOrders.length > 0 && (
                          <button
                            onClick={() => setExpanded(isExpanded ? null : customer.id)}
                            className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors"
                          >
                            Orders
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded order history */}
                    {isExpanded && (
                      <tr key={`${customer.id}-orders`} className="bg-surface border-b border-ink/5">
                        <td colSpan={8} className="px-5 py-3">
                          <p className="text-xs font-semibold text-ink-faint uppercase tracking-wide mb-2">Recent orders</p>
                          <div className="space-y-1.5">
                            {recentOrders.map(o => (
                              <div key={o.id} className="flex items-center justify-between text-sm">
                                <span className="font-medium text-ink">{o.order_number}</span>
                                <span className="text-ink-muted">{formatDate(o.created_at)}</span>
                                <span className="capitalize text-xs px-2 py-0.5 rounded-full bg-surface-overlay text-ink-muted">{o.status}</span>
                                <span className="font-semibold text-ink">₹{Math.round(o.total_amount)}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
