export default function NoCafeSetup() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-surface-raised border border-ink/5 flex items-center justify-center mx-auto mb-5 text-3xl">
          🏪
        </div>
        <h2 className="font-display text-xl font-bold text-ink mb-2">No cafe linked</h2>
        <p className="text-ink-muted text-sm mb-4">
          Your account is not linked to a cafe yet. Run this in your Supabase SQL Editor:
        </p>
        <pre className="bg-surface-overlay rounded-xl px-4 py-3 text-xs text-ink-muted text-left overflow-auto border border-ink/5 whitespace-pre-wrap break-all">
{`UPDATE cafes
SET owner_id = 'YOUR-UUID-HERE'
WHERE slug = 'sunrise-cafe';`}
        </pre>
        <p className="text-xs text-ink-faint mt-3">
          Find your UUID: Supabase Dashboard → Authentication → Users
        </p>
        <p className="text-xs text-ink-faint mt-1">
          Then refresh this page.
        </p>
      </div>
    </div>
  )
}
