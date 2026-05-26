'use client'
import { useState } from 'react'
import { Plus, Send, Users, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import CampaignDrawer from './CampaignDrawer'
import toast from 'react-hot-toast'

interface Campaign {
  id: string
  name: string
  segment: string
  message: string
  status: string
  sent_count: number
  failed_count: number
  sent_at: string | null
  created_at: string
}

interface SegmentCounts {
  all: number
  vip: number
  regular: number
  lapsed: number
}

interface Props {
  initialCampaigns: Campaign[]
  cafeId: string
  segmentCounts: SegmentCounts
}

const STATUS_ICON: Record<string, React.ElementType> = {
  draft:   Clock,
  sending: Clock,
  sent:    CheckCircle2,
  failed:  AlertCircle,
}

const STATUS_COLOR: Record<string, string> = {
  draft:   'text-ink-muted bg-surface-overlay',
  sending: 'text-amber-600 bg-amber-50',
  sent:    'text-green-600 bg-green-50',
  failed:  'text-red-600 bg-red-50',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function CampaignClient({ initialCampaigns, cafeId, segmentCounts }: Props) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sending, setSending] = useState<string | null>(null)

  async function sendCampaign(id: string) {
    setSending(id)
    try {
      const res = await fetch(`/api/campaigns/${id}/send`, { method: 'POST' })
      const { data, error } = await res.json()
      if (error) throw new Error(error)
      setCampaigns(prev => prev.map(c => c.id === id ? data : c))
      toast.success(`Sent to ${data.sent_count} customers`)
    } catch (err: any) {
      toast.error(err.message ?? 'Send failed')
    } finally {
      setSending(null)
    }
  }

  function onCampaignCreated(campaign: Campaign) {
    setCampaigns(prev => [campaign, ...prev])
    setDrawerOpen(false)
    toast.success('Campaign created')
  }

  const totalSent = campaigns.filter(c => c.status === 'sent').reduce((s, c) => s + c.sent_count, 0)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Campaigns</h1>
          <p className="text-ink-muted text-sm mt-0.5">WhatsApp broadcast messages</p>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-400 hover:bg-brand-500 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus size={15} />
          New campaign
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'All customers',  value: segmentCounts.all,     icon: Users },
          { label: 'VIP',            value: segmentCounts.vip,     icon: Users },
          { label: 'Regular',        value: segmentCounts.regular, icon: Users },
          { label: 'Total messages sent', value: totalSent,        icon: Send  },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-surface-raised rounded-2xl border border-ink/5 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={13} className="text-ink-faint" />
              <p className="text-xs text-ink-faint uppercase tracking-wide font-medium">{label}</p>
            </div>
            <p className="font-display text-2xl font-bold text-ink">{value}</p>
          </div>
        ))}
      </div>

      {/* Campaign list */}
      {campaigns.length === 0 ? (
        <div className="bg-surface-raised rounded-2xl border border-ink/5 p-12 text-center">
          <Send size={32} className="text-ink-faint mx-auto mb-3" />
          <p className="font-semibold text-ink mb-1">No campaigns yet</p>
          <p className="text-ink-muted text-sm">Create your first WhatsApp broadcast to reach your customers.</p>
        </div>
      ) : (
        <div className="bg-surface-raised rounded-2xl border border-ink/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/5">
                {['Campaign', 'Segment', 'Status', 'Sent', 'Date', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-ink-faint uppercase tracking-wide px-4 py-3 first:pl-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => {
                const StatusIcon = STATUS_ICON[c.status] ?? Clock
                return (
                  <tr key={c.id} className="border-b border-ink/5 last:border-0 hover:bg-surface-overlay/50">
                    <td className="px-4 py-3 pl-5">
                      <p className="font-medium text-ink">{c.name}</p>
                      <p className="text-xs text-ink-faint truncate max-w-48">{c.message.slice(0, 60)}…</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize text-xs px-2 py-0.5 rounded-full bg-surface-overlay text-ink-muted font-medium">
                        {c.segment}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLOR[c.status] ?? ''}`}>
                        <StatusIcon size={10} />
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {c.status === 'sent' ? `${c.sent_count} / ${c.sent_count + c.failed_count}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3">
                      {c.status === 'draft' && (
                        <button
                          onClick={() => sendCampaign(c.id)}
                          disabled={sending === c.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-400 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          <Send size={11} />
                          {sending === c.id ? 'Sending…' : 'Send'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {drawerOpen && (
        <CampaignDrawer
          cafeId={cafeId}
          segmentCounts={segmentCounts}
          onSave={onCampaignCreated}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  )
}
