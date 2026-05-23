'use client'
import { useEffect, useState } from 'react'
import { X, Check, CheckCheck } from 'lucide-react'

interface Props {
  cafeName: string
  message: string
  autoOpenDelay?: number   // ms, default 1500
  phoneNumber?: string     // masked display e.g. "+91 98765 XXXXX"
}

export default function WhatsAppPreview({
  cafeName,
  message,
  autoOpenDelay = 1500,
  phoneNumber,
}: Props) {
  const [open, setOpen] = useState(false)
  const [bubbleVisible, setBubbleVisible] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setBubbleVisible(true), 500)
    const t2 = setTimeout(() => setOpen(true), autoOpenDelay)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [autoOpenDelay])

  const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

  return (
    <>
      {/* Floating WA button — shown when chat closed */}
      {bubbleVisible && !open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center animate-bounce-soft"
          style={{ backgroundColor: '#25D366' }}
          aria-label="WhatsApp preview"
        >
          <WhatsAppIcon size={28} />
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            1
          </span>
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-6 right-4 z-50 w-80 rounded-2xl overflow-hidden shadow-2xl animate-slide-up">
          {/* WA header */}
          <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: '#075E54' }}>
            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: '#128C7E' }}
            >
              {cafeName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold leading-tight truncate">{cafeName}</p>
              <p className="text-green-200 text-[11px]">
                {phoneNumber ?? 'Business Account'}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={16} className="text-white/80" />
            </button>
          </div>

          {/* Chat body */}
          <div
            className="px-3 py-4 min-h-32"
            style={{
              backgroundColor: '#ECE5DD',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h60v60H0z' fill='none'/%3E%3C/svg%3E")`,
            }}
          >
            {/* Message bubble */}
            <div className="flex justify-start">
              <div
                className="relative max-w-[85%] rounded-lg rounded-tl-none px-3 py-2 shadow-sm"
                style={{ backgroundColor: '#FFFFFF' }}
              >
                {/* Bubble tail */}
                <div
                  className="absolute -left-2 top-0 w-0 h-0"
                  style={{
                    borderTop: '8px solid #FFFFFF',
                    borderLeft: '8px solid transparent',
                  }}
                />
                <p
                  className="text-[13px] leading-relaxed whitespace-pre-wrap"
                  style={{ color: '#303030' }}
                >
                  {message}
                </p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[10px]" style={{ color: '#8696A0' }}>{time}</span>
                  <CheckCheck size={13} style={{ color: '#53BDEB' }} />
                </div>
              </div>
            </div>
          </div>

          {/* WA footer — fake input */}
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{ backgroundColor: '#F0F2F5' }}
          >
            <div
              className="flex-1 rounded-full px-4 py-2 text-xs"
              style={{ backgroundColor: '#FFFFFF', color: '#8696A0' }}
            >
              Type a message
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#00A884' }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </div>
          </div>

          {/* Demo label */}
          <div className="text-center py-1.5" style={{ backgroundColor: '#075E54' }}>
            <span className="text-[10px] text-green-200 font-medium tracking-wide">
              DEMO PREVIEW · Actual message via Wati
            </span>
          </div>
        </div>
      )}
    </>
  )
}

function WhatsAppIcon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="white">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.104.549 4.089 1.508 5.814L0 24l6.335-1.489A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.797 9.797 0 01-5.032-1.393l-.361-.214-3.741.881.894-3.657-.235-.374A9.795 9.795 0 012.182 12C2.182 6.578 6.578 2.182 12 2.182S21.818 6.578 21.818 12 17.422 21.818 12 21.818z" />
    </svg>
  )
}
