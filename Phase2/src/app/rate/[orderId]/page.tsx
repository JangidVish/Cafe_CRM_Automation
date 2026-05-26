import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import RatingForm from './RatingForm'

export const metadata = { title: 'Rate your order' }

export default async function RatePage({ params }: { params: { orderId: string } }) {
  const supabase = createAdminClient()

  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, cafe_id, cafes(name)')
    .eq('id', params.orderId)
    .single()

  if (!order) notFound()

  const { data: existing } = await supabase
    .from('order_ratings')
    .select('rating')
    .eq('order_id', params.orderId)
    .single()

  const cafe = order.cafes as any

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-400 flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl">★</span>
          </div>
          <h1 className="font-display text-xl font-bold text-ink">{cafe?.name ?? 'Cafe'}</h1>
          <p className="text-ink-muted text-sm mt-1">Order {order.order_number}</p>
        </div>

        <div className="bg-surface-raised rounded-3xl border border-ink/5 p-6 shadow-sm">
          {existing ? (
            <div className="text-center py-4">
              <p className="text-3xl mb-3">{'★'.repeat(existing.rating)}{'☆'.repeat(5 - existing.rating)}</p>
              <p className="font-semibold text-ink">Thanks for your feedback!</p>
              <p className="text-ink-muted text-sm mt-1">You rated this order {existing.rating}/5</p>
            </div>
          ) : (
            <RatingForm orderId={params.orderId} />
          )}
        </div>
      </div>
    </div>
  )
}
