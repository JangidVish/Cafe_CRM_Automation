import type { Metadata } from 'next'
import Link from 'next/link'
import SignUpForm from './SignUpForm'

export const metadata: Metadata = { title: 'Create account — Cafe Dashboard' }

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-brand-400 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-display font-bold text-xl">C</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-ink">Create your account</h1>
          <p className="text-ink-muted text-sm mt-1">Set up your cafe dashboard</p>
        </div>

        <div className="bg-surface-raised rounded-3xl border border-ink/5 p-6 shadow-sm">
          <SignUpForm />
        </div>

        <p className="text-center text-sm text-ink-muted mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
