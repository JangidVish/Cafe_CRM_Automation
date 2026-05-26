'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function RatingForm({ orderId }: { orderId: string }) {
  const [rating,    setRating]    = useState(0)
  const [hovered,   setHovered]   = useState(0)
  const [comment,   setComment]   = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving,    setSaving]    = useState(false)

  async function submit() {
    if (!rating) { toast.error('Please select a star rating'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, rating, comment: comment.trim() || undefined }),
      })
      const { error } = await res.json()
      if (error === 'Already rated') { setSubmitted(true); return }
      if (error) throw new Error(error)
      setSubmitted(true)
    } catch (err: any) {
      toast.error(err.message ?? 'Could not save rating')
    } finally {
      setSaving(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-4">
        <p className="text-4xl mb-3">{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</p>
        <p className="font-semibold text-ink text-lg">Thank you!</p>
        <p className="text-ink-muted text-sm mt-1">Your feedback helps us improve.</p>
      </div>
    )
  }

  const display = hovered || rating

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-ink text-center mb-3">How was your experience?</p>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map(s => (
            <button
              key={s}
              onClick={() => setRating(s)}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(0)}
              className={`text-3xl transition-transform hover:scale-110 active:scale-95 ${
                s <= display ? 'text-yellow-400' : 'text-ink/15'
              }`}
            >
              ★
            </button>
          ))}
        </div>
        {display > 0 && (
          <p className="text-center text-xs text-ink-muted mt-2">
            {['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent!'][display]}
          </p>
        )}
      </div>

      <div>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Any comments? (optional)"
          rows={3}
          className="w-full text-sm text-ink placeholder:text-ink-faint bg-surface-overlay rounded-xl px-3 py-2.5 resize-none border border-ink/8 focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>

      <button
        onClick={submit}
        disabled={saving || !rating}
        className="w-full bg-brand-400 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold py-3 rounded-2xl text-sm transition-colors"
      >
        {saving ? 'Submitting…' : 'Submit rating'}
      </button>
    </div>
  )
}
