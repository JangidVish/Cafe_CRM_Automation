'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Gift } from 'lucide-react'
import { useCartStore } from '@/lib/hooks/useCart'
import type { Cafe, Table } from '@/lib/types'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface Props {
  cafe: Cafe
  table: Table
  onClose: () => void
}

function loadRazorpayScript(): Promise<boolean> {
  if ((window as any).Razorpay) return Promise.resolve(true)
  return new Promise(resolve => {
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

export default function CartSheet({ cafe, table, onClose }: Props) {
  const { cart, updateQuantity, removeItem, subtotal, clearCart } = useCartStore()
  const [notes, setNotes]           = useState('')
  const [phone, setPhone]           = useState('')
  const [payMethod, setPayMethod]   = useState<'upi' | 'cash'>('upi')
  const [placing, setPlacing]       = useState(false)
  const [pointsBalance, setPointsBalance]   = useState(0)
  const [loyaltyConfig, setLoyaltyConfig]   = useState<{ points_per_rupee: number; rupees_per_point: number; min_points_to_redeem: number; is_enabled: boolean } | null>(null)
  const [redeemPoints, setRedeemPoints]     = useState(false)
  const phoneDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  // Fetch loyalty data when phone number is complete
  useEffect(() => {
    if (phoneDebounce.current) clearTimeout(phoneDebounce.current)
    if (phone.length !== 10) {
      setPointsBalance(0)
      setLoyaltyConfig(null)
      setRedeemPoints(false)
      return
    }
    phoneDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/loyalty?cafeId=${cafe.id}&phone=${phone}`)
        const { data } = await res.json()
        if (data) {
          setLoyaltyConfig(data.config)
          setPointsBalance(data.balance ?? 0)
        }
      } catch { /* ignore */ }
    }, 600)
  }, [phone, cafe.id])

  if (!cart) return null

  const sub = subtotal()
  const tax = Math.round(sub * (cafe.settings.tax_percent / 100))
  const canRedeem = loyaltyConfig?.is_enabled && pointsBalance >= (loyaltyConfig?.min_points_to_redeem ?? 50)
  const pointsDiscount = redeemPoints && canRedeem
    ? Math.min(Math.floor(pointsBalance * (loyaltyConfig?.rupees_per_point ?? 0.5)), sub + tax)
    : 0
  const total = sub + tax - pointsDiscount

  async function placeOrder() {
    setPlacing(true)
    try {
      // 1. Create our order row
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cafeId: cafe.id,
          tableId: table.id,
          items: cart!.items.map(i => ({
            menuItemId: i.menuItem.id,
            name: i.menuItem.name,
            price: i.menuItem.price,
            quantity: i.quantity,
            customisation: i.customisation,
          })),
          paymentMethod: payMethod,
          notes,
          customerPhone: phone.trim() || undefined,
          subtotal: sub,
          taxAmount: tax,
          discountAmount: pointsDiscount,
          pointsRedeemed: redeemPoints && canRedeem ? pointsBalance : 0,
          totalAmount: total,
        }),
      })
      const { data: order, error: orderErr } = await orderRes.json()
      if (orderErr) throw new Error(orderErr)

      // 2. Cash → straight to order page
      if (payMethod === 'cash') {
        clearCart()
        router.push(`/order/${order.id}`)
        return
      }

      // 3. UPI → open Razorpay
      const loaded = await loadRazorpayScript()
      if (!loaded) {
        toast.error('Could not load payment gateway. Try again.')
        setPlacing(false)
        return
      }

      const payRes = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', orderId: order.id, amount: total }),
      })
      const { data: payData, error: payErr } = await payRes.json()
      if (payErr) throw new Error(payErr)

      const rzp = new (window as any).Razorpay({
        key:         payData.keyId,
        amount:      payData.amount,
        currency:    'INR',
        name:        cafe.name,
        description: `Table ${table.number}`,
        order_id:    payData.razorpayOrderId,
        prefill:     { contact: phone ? `91${phone}` : '' },
        theme:       { color: '#FF9500' },
        handler: async (response: any) => {
          // Verify signature server-side
          await fetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action:             'verify',
              orderId:            order.id,
              razorpayOrderId:    response.razorpay_order_id,
              razorpayPaymentId:  response.razorpay_payment_id,
              razorpaySignature:  response.razorpay_signature,
            }),
          })
          clearCart()
          router.push(`/order/${order.id}`)
        },
        modal: {
          ondismiss: () => {
            // Payment abandoned — still go to order page, WA won't fire (payment_status stays pending)
            clearCart()
            router.push(`/order/${order.id}`)
          },
        },
      })
      rzp.open()
      setPlacing(false)
    } catch (err) {
      toast.error('Could not place order. Please try again.')
      setPlacing(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/40 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-surface-raised rounded-t-3xl animate-slide-up max-h-[85vh] overflow-auto pb-safe">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-ink/15 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink/5">
          <h2 className="font-display text-lg font-semibold">Your order</h2>
          <span className="text-sm text-ink-muted">Table {table.number}</span>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-surface-overlay">
            <X size={18} className="text-ink-muted" />
          </button>
        </div>

        {/* Cart items */}
        <div className="px-5 py-3 space-y-3">
          {cart.items.map(({ menuItem, quantity, customisation }) => (
            <div key={menuItem.id} className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-ink">{menuItem.name}</p>
                {customisation && (
                  <p className="text-xs text-ink-muted">{customisation}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(menuItem.id, quantity - 1)}
                  className="w-6 h-6 rounded-full border border-ink/20 flex items-center justify-center text-ink-muted hover:border-ink/40"
                >
                  −
                </button>
                <span className="text-sm font-medium w-4 text-center">{quantity}</span>
                <button
                  onClick={() => updateQuantity(menuItem.id, quantity + 1)}
                  className="w-6 h-6 rounded-full border border-ink/20 flex items-center justify-center text-ink-muted hover:border-ink/40"
                >
                  +
                </button>
              </div>
              <span className="text-sm font-semibold text-ink w-16 text-right">
                ₹{menuItem.price * quantity}
              </span>
            </div>
          ))}
        </div>

        {/* Phone — optional, for WhatsApp confirmation */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 bg-surface-overlay rounded-xl border border-ink/5 px-3 py-2 focus-within:ring-1 focus-within:ring-brand-400">
            <span className="text-sm text-ink-muted shrink-0">🇮🇳 +91</span>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="WhatsApp number (optional)"
              className="flex-1 text-sm text-ink placeholder:text-ink-faint bg-transparent focus:outline-none"
            />
          </div>
          <p className="text-[11px] text-ink-faint mt-1 px-1">Get order updates on WhatsApp</p>
        </div>

        {/* Loyalty points redeem */}
        {canRedeem && (
          <div className="px-5 pb-3">
            <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-brand-200 bg-brand-50 cursor-pointer">
              <div className="flex items-center gap-2">
                <Gift size={14} className="text-brand-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-brand-700">
                    Use {pointsBalance} points (₹{Math.floor(pointsBalance * (loyaltyConfig?.rupees_per_point ?? 0.5))} off)
                  </p>
                  <p className="text-[11px] text-brand-500">Your loyalty reward</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={redeemPoints}
                onChange={e => setRedeemPoints(e.target.checked)}
                className="accent-brand-500 w-4 h-4"
              />
            </label>
          </div>
        )}

        {/* Notes */}
        <div className="px-5 pb-3">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any special requests? (e.g. no sugar, extra spicy)"
            className="w-full text-sm text-ink placeholder:text-ink-faint bg-surface-overlay rounded-xl px-3 py-2 resize-none border border-ink/5 focus:outline-none focus:ring-1 focus:ring-brand-400"
            rows={2}
          />
        </div>

        {/* Payment method */}
        <div className="px-5 pb-3">
          <p className="text-xs text-ink-muted mb-2 font-medium uppercase tracking-wide">Pay by</p>
          <div className="flex gap-2">
            {cafe.settings.accept_upi && (
              <button
                onClick={() => setPayMethod('upi')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  payMethod === 'upi'
                    ? 'border-brand-400 bg-brand-50 text-brand-700'
                    : 'border-ink/10 text-ink-muted'
                }`}
              >
                UPI / QR
              </button>
            )}
            {cafe.settings.accept_cash && (
              <button
                onClick={() => setPayMethod('cash')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  payMethod === 'cash'
                    ? 'border-brand-400 bg-brand-50 text-brand-700'
                    : 'border-ink/10 text-ink-muted'
                }`}
              >
                Pay at counter
              </button>
            )}
          </div>
        </div>

        {/* Bill summary */}
        <div className="mx-5 mb-4 bg-surface-overlay rounded-2xl p-4 space-y-1.5">
          <div className="flex justify-between text-sm text-ink-muted">
            <span>Subtotal</span><span>₹{sub}</span>
          </div>
          <div className="flex justify-between text-sm text-ink-muted">
            <span>GST ({cafe.settings.tax_percent}%)</span><span>₹{tax}</span>
          </div>
          {pointsDiscount > 0 && (
            <div className="flex justify-between text-sm text-brand-600 font-medium">
              <span>Points discount</span><span>−₹{pointsDiscount}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold text-ink pt-1.5 border-t border-ink/10">
            <span>Total</span><span>₹{total}</span>
          </div>
        </div>

        {/* CTA */}
        <div className="px-5 pb-6">
          <button
            onClick={placeOrder}
            disabled={placing}
            className="w-full bg-brand-400 hover:bg-brand-500 disabled:opacity-60 text-white font-semibold py-4 rounded-2xl text-base transition-colors active:scale-[0.98]"
          >
            {placing
              ? 'Placing your order...'
              : payMethod === 'upi'
                ? `Pay ₹${total} via UPI`
                : `Place order · ₹${total}`
            }
          </button>
        </div>
      </div>

    </>
  )
}
