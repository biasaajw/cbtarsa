import { useEffect } from 'react'
import { Copy, KeyRound, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Panel } from './shell'
import { getActiveToken, getExam, rotateToken } from '@/lib/exam-store'
import { fmtClock, useNow, useStore } from '@/lib/use-store'

/** Token ujian: satu token untuk semua siswa, otomatis diganti tiap interval, bisa diganti manual. */
export function TokenCard({ by, className }: { by: string; className?: string }) {
  const token = useStore(getActiveToken)
  const now = useNow()
  const interval = (useStore(getExam)?.tokenIntervalMinutes ?? 5) * 60_000
  const left = token ? token.expiresAt - now : 0

  useEffect(() => {
    if (token && left <= 0) getActiveToken() // rotasi otomatis saat kedaluwarsa
  }, [left, token])

  const pct = Math.max(0, Math.min(1, left / interval))
  return (
    <Panel title="Token ujian" icon={KeyRound} className={className}>
      <div className="flex items-center gap-5">
        <div className="relative size-24 shrink-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
            <circle cx="50" cy="50" r="44" fill="none" stroke="var(--muted)" strokeWidth="8" />
            <circle cx="50" cy="50" r="44" fill="none" stroke="var(--primary)" strokeWidth="8" strokeLinecap="round" strokeDasharray={276.5} strokeDashoffset={276.5 * (1 - pct)} className="transition-[stroke-dashoffset] duration-1000 ease-linear" />
          </svg>
          <span className="absolute inset-0 grid place-items-center font-mono text-sm font-bold tabular-nums">{fmtClock(Math.max(0, left))}</span>
        </div>
        <div className="min-w-0">
          <p className="font-mono text-3xl font-bold tracking-[0.25em] text-primary sm:text-4xl">{token?.code ?? '······'}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Berlaku untuk semua siswa · diganti otomatis tiap {interval / 60000} menit
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => { rotateToken(by); toast.success('Token baru dibuat.') }} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:brightness-110">
              <RefreshCw className="size-3.5" /> Ganti sekarang
            </button>
            <button type="button" onClick={() => { if (token) void navigator.clipboard.writeText(token.code); toast('Token disalin.') }} className="neu-sm flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold">
              <Copy className="size-3.5" /> Salin
            </button>
          </div>
        </div>
      </div>
    </Panel>
  )
}
