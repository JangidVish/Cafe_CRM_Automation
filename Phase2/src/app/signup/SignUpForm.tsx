'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2, Mail } from 'lucide-react'

export default function SignUpForm() {
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)

  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // If session exists, email confirmation is disabled — go straight to dashboard
    if (data.session) {
      router.push('/dashboard')
      router.refresh()
      return
    }

    // Email confirmation is required
    setCheckEmail(true)
    setLoading(false)
  }

  if (checkEmail) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
          <Mail size={20} className="text-brand-500" />
        </div>
        <h3 className="font-display font-semibold text-ink mb-2">Check your email</h3>
        <p className="text-sm text-ink-muted">
          We sent a confirmation link to{' '}
          <span className="font-medium text-ink">{email}</span>.
          Click it to activate your account.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="owner@mycafe.com"
          className="w-full text-sm text-ink placeholder:text-ink-faint bg-surface-overlay rounded-xl px-4 py-3 border border-ink/8 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
          Password
        </label>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="Min. 8 characters"
            className="w-full text-sm text-ink placeholder:text-ink-faint bg-surface-overlay rounded-xl px-4 py-3 pr-11 border border-ink/8 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted transition-colors"
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
          Confirm password
        </label>
        <input
          type={showPw ? 'text' : 'password'}
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          placeholder="Repeat password"
          className="w-full text-sm text-ink placeholder:text-ink-faint bg-surface-overlay rounded-xl px-4 py-3 border border-ink/8 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-400 hover:bg-brand-500 disabled:opacity-60 text-white font-semibold py-3.5 rounded-2xl text-sm transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {loading ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  )
}
