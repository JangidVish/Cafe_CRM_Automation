'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Order } from '@/lib/types'

// Module-level singleton — one WS connection for the whole browser session
const supabase = createClient()

export function useKitchenOrders(cafeId: string) {
  const [orders,    setOrders]    = useState<Order[]>([])
  const [loading,   setLoading]   = useState(true)
  const [connected, setConnected] = useState(false)
  const channelRef  = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const mountedRef  = useRef(true)
  const retryTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mountedRef.current = true

    async function fetchOrders() {
      const { data } = await supabase
        .from('orders')
        .select('*, items:order_items(*), table:tables(number, label)')
        .eq('cafe_id', cafeId)
        .in('status', ['pending', 'confirmed', 'making', 'ready'])
        .order('created_at', { ascending: true })
      if (mountedRef.current) {
        setOrders((data as Order[]) ?? [])
        setLoading(false)
      }
    }

    async function fetchSingle(id: string): Promise<Order | null> {
      const { data } = await supabase
        .from('orders')
        .select('*, items:order_items(*), table:tables(number, label)')
        .eq('id', id)
        .single()
      return (data as Order) ?? null
    }

    function subscribe() {
      // Remove stale channel before creating a new one
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      if (retryTimer.current) {
        clearTimeout(retryTimer.current)
        retryTimer.current = null
      }

      const channel = supabase
        .channel(`kitchen:${cafeId}:${Date.now()}`) // unique name prevents stale channel reuse
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `cafe_id=eq.${cafeId}` },
          async (payload) => {
            if (!mountedRef.current) return

            if (payload.eventType === 'INSERT') {
              const order = await fetchSingle(payload.new.id)
              if (order && mountedRef.current) {
                setOrders(prev => {
                  // Guard against duplicates from concurrent INSERT + initial fetch
                  if (prev.some(o => o.id === order.id)) return prev
                  return [...prev, order]
                })
              }

            } else if (payload.eventType === 'UPDATE') {
              const { status, id } = payload.new as { status: string; id: string }

              if (['completed', 'cancelled', 'served'].includes(status)) {
                setOrders(prev => prev.filter(o => o.id !== id))
              } else {
                // Always re-fetch the full row — payload.new is a flat DB row with no joins
                const order = await fetchSingle(id)
                if (order && mountedRef.current) {
                  setOrders(prev => prev.map(o => o.id === id ? order : o))
                }
              }
            }
          }
        )
        .subscribe((status) => {
          if (!mountedRef.current) return
          const isLive = status === 'SUBSCRIBED'
          setConnected(isLive)

          if (['TIMED_OUT', 'CHANNEL_ERROR', 'CLOSED'].includes(status)) {
            // Exponential-ish backoff: retry after 3 s
            retryTimer.current = setTimeout(() => {
              if (mountedRef.current) {
                fetchOrders() // re-sync state in case we missed events while offline
                subscribe()
              }
            }, 3000)
          }
        })

      channelRef.current = channel
    }

    fetchOrders()
    subscribe()

    return () => {
      mountedRef.current = false
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      if (retryTimer.current) {
        clearTimeout(retryTimer.current)
      }
    }
  }, [cafeId])

  return { orders, loading, connected }
}

// Hook for customer to track their own order
export function useOrderStatus(orderId: string) {
  const [order, setOrder] = useState<Order | null>(null)

  useEffect(() => {
    if (!orderId) return
    let mounted = true

    supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('id', orderId)
      .single()
      .then(({ data }) => { if (mounted) setOrder(data as Order) })

    const channel = supabase
      .channel(`order:${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => { if (mounted) setOrder(prev => prev ? { ...prev, ...payload.new } : null) }
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [orderId])

  return order
}
