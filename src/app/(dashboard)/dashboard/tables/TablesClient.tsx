'use client'
import { useState } from 'react'
import type { Table } from '@/lib/types'
import { QrCode, Download, Printer, Plus, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface QRResult {
  tableId:     string
  tableNumber: number
  label:       string | null
  menuUrl:     string
  qrDataUrl:   string
}

interface Props {
  initialTables: Table[]
  cafeId:        string
  cafeSlug:      string
}

function downloadQR(qrDataUrl: string, tableNumber: number) {
  const a = document.createElement('a')
  a.href = qrDataUrl
  a.download = `table-${tableNumber}-qr.png`
  a.click()
}

export default function TablesClient({ initialTables, cafeId, cafeSlug }: Props) {
  const [tables, setTables]         = useState<Table[]>(initialTables)
  const [qrMap, setQrMap]           = useState<Record<string, QRResult>>({})
  const [generating, setGenerating] = useState(false)
  const [toggling, setToggling]     = useState<string | null>(null)

  // Add table form
  const [showAdd, setShowAdd]   = useState(false)
  const [newNumber, setNewNumber] = useState('')
  const [newLabel, setNewLabel]   = useState('')
  const [adding, setAdding]       = useState(false)

  const active   = tables.filter(t => t.is_active).length
  const inactive = tables.length - active

  async function generateAllQRs() {
    setGenerating(true)
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-qr', cafeId, cafeSlug }),
      })
      const { data, error } = await res.json()
      if (error) throw new Error(error)
      const map: Record<string, QRResult> = {}
      for (const r of data as QRResult[]) map[r.tableId] = r
      setQrMap(map)
      toast.success(`${data.length} QR codes generated`)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to generate QR codes')
    } finally {
      setGenerating(false)
    }
  }

  async function toggleActive(table: Table) {
    setToggling(table.id)
    try {
      const res = await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: table.id, is_active: !table.is_active }),
      })
      const { data, error } = await res.json()
      if (error) throw new Error(error)
      setTables(prev => prev.map(t => t.id === table.id ? { ...t, is_active: data.is_active } : t))
    } catch {
      toast.error('Could not update table')
    } finally {
      setToggling(null)
    }
  }

  async function addTable(e: React.FormEvent) {
    e.preventDefault()
    const num = parseInt(newNumber)
    if (!num || num < 1) { toast.error('Enter a valid table number'); return }
    if (tables.some(t => t.number === num)) { toast.error(`Table ${num} already exists`); return }

    setAdding(true)
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', cafeId, number: num, label: newLabel }),
      })
      const { data, error } = await res.json()
      if (error) throw new Error(error)
      setTables(prev => [...prev, data as Table].sort((a, b) => a.number - b.number))
      setNewNumber('')
      setNewLabel('')
      setShowAdd(false)
      toast.success(`Table ${num} added`)
    } catch (err: any) {
      toast.error(err.message ?? 'Could not add table')
    } finally {
      setAdding(false)
    }
  }

  function printQRs() {
    const hasQRs = Object.keys(qrMap).length > 0
    if (!hasQRs) { toast.error('Generate QR codes first'); return }
    window.print()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Tables & QR Codes</h1>
          <p className="text-ink-muted text-sm mt-0.5">Manage tables and generate printable QR codes</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-ink/10 text-sm font-medium text-ink-muted hover:text-ink hover:border-ink/20 transition-colors"
          >
            <Plus size={15} />
            Add table
          </button>
          <button
            onClick={generateAllQRs}
            disabled={generating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-400 hover:bg-brand-500 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
          >
            {generating ? <Loader2 size={15} className="animate-spin" /> : <QrCode size={15} />}
            {generating ? 'Generating…' : 'Generate QR Codes'}
          </button>
          <button
            onClick={printQRs}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-ink/10 text-sm font-medium text-ink-muted hover:text-ink hover:border-ink/20 transition-colors print:hidden"
          >
            <Printer size={15} />
            Print all
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total tables', value: tables.length },
          { label: 'Active',       value: active },
          { label: 'Inactive',     value: inactive },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface-raised rounded-2xl border border-ink/5 p-4">
            <p className="text-xs text-ink-faint uppercase tracking-wide font-medium">{label}</p>
            <p className="font-display text-3xl font-bold text-ink mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Add table form */}
      {showAdd && (
        <form
          onSubmit={addTable}
          className="bg-surface-raised border border-brand-200 rounded-2xl p-4 mb-6 flex gap-3 items-end flex-wrap"
        >
          <div>
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide block mb-1">
              Table number *
            </label>
            <input
              type="number"
              min={1}
              value={newNumber}
              onChange={e => setNewNumber(e.target.value)}
              placeholder="e.g. 7"
              className="w-24 text-sm border border-ink/10 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-surface"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide block mb-1">
              Label (optional)
            </label>
            <input
              type="text"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="e.g. Window Seat"
              className="w-48 text-sm border border-ink/10 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-surface"
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-400 text-white text-sm font-semibold rounded-xl hover:bg-brand-500 disabled:opacity-60 transition-colors"
          >
            {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(false)}
            className="px-3 py-2 text-sm text-ink-muted hover:text-ink transition-colors"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Tables grid */}
      {tables.length === 0 ? (
        <div className="bg-surface-raised rounded-2xl border border-ink/5 p-12 text-center">
          <QrCode size={32} className="text-ink-faint mx-auto mb-3" />
          <p className="text-ink-muted text-sm">No tables yet — add your first table above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {tables.map(table => {
            const qr = qrMap[table.id]
            const isToggling = toggling === table.id
            return (
              <div
                key={table.id}
                className={`bg-surface-raised rounded-2xl border p-4 flex flex-col items-center gap-3 transition-opacity ${
                  table.is_active ? 'border-ink/5' : 'border-ink/5 opacity-50'
                }`}
              >
                {/* Table number */}
                <div className="text-center">
                  <p className="font-display text-3xl font-bold text-ink">{table.number}</p>
                  {table.label && (
                    <p className="text-xs text-ink-faint mt-0.5">{table.label}</p>
                  )}
                </div>

                {/* QR code */}
                {qr ? (
                  <img
                    src={qr.qrDataUrl}
                    alt={`QR Table ${table.number}`}
                    className="w-full rounded-xl"
                  />
                ) : (
                  <div className="w-full aspect-square rounded-xl bg-surface-overlay flex items-center justify-center">
                    <QrCode size={32} className="text-ink-faint" />
                  </div>
                )}

                {/* URL preview */}
                {qr && (
                  <p className="text-[10px] text-ink-faint text-center break-all leading-tight">
                    {qr.menuUrl}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 w-full">
                  {qr && (
                    <button
                      onClick={() => downloadQR(qr.qrDataUrl, table.number)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-ink/10 text-xs font-medium text-ink-muted hover:text-ink hover:border-ink/20 transition-colors print:hidden"
                    >
                      <Download size={12} />
                      Download
                    </button>
                  )}
                  <button
                    onClick={() => toggleActive(table)}
                    disabled={isToggling}
                    className="flex items-center justify-center p-1.5 rounded-lg border border-ink/10 text-ink-faint hover:text-ink hover:border-ink/20 transition-colors print:hidden"
                    title={table.is_active ? 'Deactivate table' : 'Activate table'}
                  >
                    {isToggling
                      ? <Loader2 size={14} className="animate-spin" />
                      : table.is_active
                        ? <ToggleRight size={14} className="text-brand-400" />
                        : <ToggleLeft size={14} />
                    }
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Print styles — only QR grid visible when printing */}
      <style jsx global>{`
        @media print {
          body > *:not(#__next) { display: none; }
          .print\\:hidden { display: none !important; }
          nav, aside, header { display: none !important; }
        }
      `}</style>
    </div>
  )
}
