'use client'
import { useEffect, useState } from 'react'
import { differenceInMinutes } from 'date-fns'
import { useKitchenOrders } from '@/lib/hooks/useKitchenOrders'
import type { Order, OrderItem, OrderStatus } from '@/lib/types'
import toast from 'react-hot-toast'

const STATUS_FLOW: Record<string, OrderStatus> = {
  pending:   'confirmed',
  confirmed: 'making',
  making:    'ready',
  ready:     'served',
}

const STATUS_LABEL: Record<string, string> = {
  pending:   'New',
  confirmed: 'Confirm',
  making:    'Preparing',
  ready:     'Ready!',
}

const STATUS_COLOUR: Record<string, string> = {
  pending:   'bg-green-500',
  confirmed: 'bg-blue-500',
  making:    'bg-amber-500',
  ready:     'bg-purple-500',
}

const ITEM_STATUS_CYCLE: Record<string, string> = {
  pending: 'making',
  making:  'done',
  done:    'done',
}

const ITEM_STATUS_STYLE: Record<string, string> = {
  pending: 'text-gray-300',
  making:  'text-amber-300',
  done:    'text-green-500 line-through opacity-50',
}

function getTimerClass(createdAt: string): string {
  const mins = differenceInMinutes(new Date(), new Date(createdAt))
  if (mins > 20) return 'text-red-500'
  if (mins > 10) return 'text-amber-500'
  return 'text-green-500'
}

function Timer({ createdAt }: { createdAt: string }) {
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const id = setInterval(() => forceUpdate(n => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])
  const mins = differenceInMinutes(new Date(), new Date(createdAt))
  return (
    <span className={`text-2xl font-mono font-bold tabular-nums ${getTimerClass(createdAt)}`}>
      {mins}m
    </span>
  )
}

async function updateOrderStatus(orderId: string, status: OrderStatus) {
  await fetch('/api/orders', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, status }),
  })
}

async function cycleItemStatus(itemId: string, currentStatus: string): Promise<string | null> {
  const next = ITEM_STATUS_CYCLE[currentStatus]
  if (!next || next === currentStatus) return null
  const res = await fetch('/api/order-items', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId, status: next }),
  })
  const { data, error } = await res.json()
  if (error) return null
  return data?.status ?? null
}

interface Props { cafeId: string }

export default function KitchenDisplay({ cafeId }: Props) {
  const { orders, loading, connected } = useKitchenOrders(cafeId)
  const [itemStatuses, setItemStatuses] = useState<Record<string, string>>({})
  const [togglingItem, setTogglingItem] = useState<string | null>(null)

  const columns: Record<string, Order[]> = {
    pending:   orders.filter(o => o.status === 'pending'),
    confirmed: orders.filter(o => o.status === 'confirmed'),
    making:    orders.filter(o => o.status === 'making'),
    ready:     orders.filter(o => o.status === 'ready'),
  }

  async function advance(order: Order) {
    const next = STATUS_FLOW[order.status]
    if (!next) return
    await updateOrderStatus(order.id, next)
    toast.success(`${order.order_number} → ${next}`)
  }

  async function toggleItem(item: OrderItem) {
    if (togglingItem === item.id) return
    const current = itemStatuses[item.id] ?? item.status ?? 'pending'
    if (current === 'done') return
    setTogglingItem(item.id)
    const next = await cycleItemStatus(item.id, current)
    if (next) setItemStatuses(prev => ({ ...prev, [item.id]: next }))
    setTogglingItem(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-white text-lg animate-pulse">Loading kitchen display…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 font-body">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Kitchen Display</h1>
        <div className="flex items-center gap-3">
          {connected ? (
            <>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-sm text-gray-400">Live</span>
            </>
          ) : (
            <>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <span className="text-sm text-amber-400">Reconnecting…</span>
            </>
          )}
          <span className="text-sm text-gray-500">
            {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-4 gap-4 h-[calc(100vh-100px)]">
        {Object.entries(columns).map(([status, statusOrders]) => (
          <div key={status} className="flex flex-col">
            {/* Column header */}
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLOUR[status]}`} />
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                {STATUS_LABEL[status]}
              </h2>
              <span className="ml-auto text-xs bg-gray-800 px-2 py-0.5 rounded-full text-gray-400">
                {statusOrders.length}
              </span>
            </div>

            {/* Order cards */}
            <div className="space-y-3 overflow-y-auto flex-1 pr-1 no-scrollbar">
              {statusOrders.length === 0 && (
                <div className="border-2 border-dashed border-gray-800 rounded-2xl p-6 text-center text-gray-700 text-sm">
                  No orders
                </div>
              )}
              {statusOrders.map(order => (
                <div
                  key={order.id}
                  className={`bg-gray-900 rounded-2xl p-4 border ${
                    status === 'pending' ? 'border-green-500/30' : 'border-gray-800'
                  }`}
                >
                  {/* Order header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-xs text-gray-500 font-mono">{order.order_number}</span>
                      <div className="text-white font-semibold mt-0.5">
                        Table {(order.table as any)?.number}
                        {(order.table as any)?.label && (
                          <span className="text-gray-400 font-normal text-sm"> · {(order.table as any).label}</span>
                        )}
                      </div>
                    </div>
                    <Timer createdAt={order.created_at} />
                  </div>

                  {/* Items — tap to cycle pending → making → done */}
                  <div className="space-y-1 mb-3">
                    {(order.items ?? []).map(item => {
                      const itemStatus = itemStatuses[item.id] ?? item.status ?? 'pending'
                      const isDone     = itemStatus === 'done'
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggleItem(item)}
                          disabled={isDone || togglingItem === item.id}
                          className={`w-full flex items-start gap-2 text-sm px-2 py-1 rounded-lg transition-opacity text-left ${!isDone ? 'hover:bg-white/5 cursor-pointer' : 'cursor-default'}`}
                        >
                          <span className="text-gray-400 font-mono w-5 text-right flex-shrink-0 text-xs mt-0.5">
                            {item.quantity}×
                          </span>
                          <div className="flex-1">
                            <span className={ITEM_STATUS_STYLE[itemStatus]}>{item.name}</span>
                            {item.customisation && (
                              <div className="text-xs text-amber-400 italic">{item.customisation}</div>
                            )}
                          </div>
                          {/* Status dot */}
                          <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                            isDone ? 'bg-green-500' : itemStatus === 'making' ? 'bg-amber-400' : 'bg-gray-600'
                          }`} />
                        </button>
                      )
                    })}
                  </div>

                  {/* Notes */}
                  {order.notes && (
                    <div className="text-xs text-amber-300 bg-amber-900/20 rounded-lg px-2 py-1.5 mb-3">
                      {order.notes}
                    </div>
                  )}

                  {/* Action button */}
                  {STATUS_FLOW[order.status] && (
                    <button
                      onClick={() => advance(order)}
                      className={`w-full py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                        status === 'pending'   ? 'bg-green-600 hover:bg-green-500 text-white' :
                        status === 'confirmed' ? 'bg-blue-600 hover:bg-blue-500 text-white' :
                        status === 'making'    ? 'bg-amber-500 hover:bg-amber-400 text-black' :
                        'bg-purple-600 hover:bg-purple-500 text-white'
                      }`}
                    >
                      {status === 'pending'   ? 'Accept order' :
                       status === 'confirmed' ? 'Start preparing' :
                       status === 'making'    ? 'Mark ready' :
                       'Mark served'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
