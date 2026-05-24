import type { Metadata } from 'next'
import LoginForm from './LoginForm'

export const metadata: Metadata = { title: 'Sign in — Cafe Dashboard' }

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-brand-400 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-display font-bold text-xl">S</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-ink">Sunrise Cafe</h1>
          <p className="text-ink-muted text-sm mt-1">Sign in to your dashboard</p>
        </div>

        <div className="bg-surface-raised rounded-3xl border border-ink/5 p-6 shadow-sm">
          <LoginForm />
        </div>

        <p className="text-center text-xs text-ink-faint mt-6">
          cafe-system · Phase 6
        </p>
      </div>
    </div>
  )
}
