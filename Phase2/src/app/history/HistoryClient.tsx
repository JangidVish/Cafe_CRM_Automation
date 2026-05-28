'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import { Search, RotateCcw, Loader2 } from 'lucide-react'
import { useCartStore } from '@/lib/hooks/useCart'
import toast from 'react-hot-toast'
import type { MenuItem } from '@/lib/types'

interface OrderItem {
  id: string
  menu_item_id: string
  name: string
  price: number
  quantity: number
}

interface PastOrder {
  id: string
  order_number: string
  total_amount: number
  status: string
  created_at: string
  items: OrderItem[]
}

interface Customer {
  name: string | null
  total_orders: number
  total_spent: number
  points_balance: number
}

interface Props { cafeId: string }

export default function HistoryClient({ cafeId }: Props) {
  const [phone,     setPhone]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [customer,  setCustomer]  = useState<Customer | null>(null)
  const [orders,    setOrders]    = useState<PastOrder[]>([])
  const [searched,  setSearched]  = useState(false)
  const [reordering, setReordering] = useState<string | null>(null)

  const { cart, addItem } = useCartStore()

  async function lookup() {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length !== 10) { toast.error('Enter a 10-digit phone number'); return }

    setLoading(true)
    setSearched(false)
    try {
      const res = await fetch(`/api/history?cafeId=${cafeId}&phone=${cleaned}`)
      const { data, error } = await res.json()
      if (error) throw new Error(error)
      setCustomer(data.customer)
      setOrders(data.orders)
      setSearched(true)
    } catch (err: any) {
      toast.error(err.message ?? 'Could not fetch history')
    } finally {
      setLoading(false)
    }
  }

  function reorder(order: PastOrder) {
    if (!cart?.tableId) {
      toast.error('Please scan your table QR code first to reorder.')
      return
    }
    setReordering(order.id)
    try {
      for (const item of order.items) {
        const menuItem: MenuItem = {
          id: item.menu_item_id,
          cafe_id: cafeId,
          category_id: '',
          name: item.name,
          name_hi: null,
          description: null,
          description_hi: null,
          price: item.price,
          image_url: null,
          is_veg: true,
          is_vegan: false,
          is_jain: false,
          contains_gluten: true,
          contains_nuts: false,
          spice_level: 0,
          is_available: true,
          is_featured: false,
          sort_order: 0,
          order_count: 0,
          prep_time_mins: 10,
          upsell_item_ids: [],
          created_at: '',
          updated_at: '',
        }
        addItem(menuItem, item.quantity)
      }
      toast.success('Items added to your cart!')
    } finally {
      setReordering(null)
    }
  }

  const STATUS_COLOUR: Record<string, string> = {
    pending:   'bg-amber-100 text-amber-700',
    confirmed: 'bg-blue-100 text-blue-700',
    making:    'bg-orange-100 text-orange-700',
    ready:     'bg-green-100 text-green-700',
    served:    'bg-purple-100 text-purple-700',
    completed: 'bg-gray-100 text-gray-700',
  }

  return (
    <div className="min-h-screen bg-surface px-4 py-10">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold text-ink">Order History</h1>
          <p className="text-ink-muted text-sm mt-1">Enter your phone number to see your past orders</p>
        </div>

        {/* Phone lookup */}
        <div className="bg-surface-raised rounded-2xl border border-ink/5 p-5 mb-6">
          <div className="flex gap-2">
            <div className="flex items-center gap-2 flex-1 bg-surface-overlay rounded-xl border border-ink/5 px-3 py-2.5 focus-within:ring-1 focus-within:ring-brand-400">
              <span className="text-sm text-ink-muted shrink-0">🇮🇳 +91</span>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                onKeyDown={e => e.key === 'Enter' && lookup()}
                placeholder="10-digit number"
                className="flex-1 text-sm text-ink placeholder:text-ink-faint bg-transparent focus:outline-none"
              />
            </div>
            <button
              onClick={lookup}
              disabled={loading || phone.replace(/\D/g, '').length !== 10}
              className="px-4 py-2 bg-brand-400 text-white text-sm font-semibold rounded-xl hover:bg-brand-500 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Look up
            </button>
          </div>
        </div>

        {/* Results */}
        {searched && !customer && (
          <div className="text-center py-10 text-ink-muted text-sm">
            No orders found for this number.
          </div>
        )}

        {customer && (
          <>
            {/* Customer summary */}
            <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 mb-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-brand-400 flex items-center justify-center text-white font-bold text-sm">
                {(customer.name?.[0] ?? phone[0] ?? '?').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink">{customer.name ?? `+91 ${phone}`}</p>
                <p className="text-xs text-ink-muted">
                  {customer.total_orders} orders · ₹{Number(customer.total_spent).toLocaleString('en-IN')} spent
                  {customer.points_balance > 0 && ` · ${customer.points_balance} pts`}
                </p>
              </div>
            </div>

            {/* Order list */}
            {orders.length === 0 ? (
              <p className="text-center text-ink-muted text-sm py-6">No completed orders yet.</p>
            ) : (
              <div className="space-y-3">
                {orders.map(order => (
                  <div key={order.id} className="bg-surface-raised rounded-2xl border border-ink/5 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-xs font-mono text-ink-faint">{order.order_number}</span>
                        <p className="text-xs text-ink-muted mt-0.5">
                          {format(new Date(order.created_at), 'dd MMM yyyy, h:mm a')}
                        </p>
                      </div>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLOUR[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="space-y-0.5 mb-3">
                      {order.items.map(item => (
                        <p key={item.id} className="text-xs text-ink-muted">
                          {item.quantity}× {item.name}
                        </p>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink">
                        ₹{Math.round(order.total_amount)}
                      </span>
                      <button
                        onClick={() => reorder(order)}
                        disabled={reordering === order.id}
                        className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 border border-brand-200 bg-brand-50 hover:bg-brand-100 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                      >
                        {reordering === order.id
                          ? <Loader2 size={11} className="animate-spin" />
                          : <RotateCcw size={11} />
                        }
                        {reordering === order.id ? 'Adding…' : 'Reorder'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
