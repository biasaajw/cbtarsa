import { useState } from 'react'
import { AlertTriangle, RotateCcw, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Panel } from './shell'
import { ConfirmTwice } from '@/components/exam/confirm-twice'
import {
  getAttempt,
  getControl,
  getStudents,
  remainingMs,
  resetAttempt,
  type Attempt,
} from '@/lib/exam-store'
import { fmtClock, useNow, useStore } from '@/lib/use-store'
import { cn } from '@/lib/utils'

const violationLabel: Record<string, string> = {
  'keluar-layar-penuh': 'Keluar layar penuh',
  'pindah-tab': 'Pindah tab',
  'kehilangan-fokus': 'Pindah aplikasi',
  'muat-ulang': 'Muat ulang / tutup',
  screenshot: 'Screenshot',
  'pintasan-terlarang': 'Pintasan terlarang',
  'kamera-mati': 'Kamera mati',
  'volume-turun': 'Volume diturunkan',
  'tombol-volume': 'Tombol volume',
}

function statusOf(a: Attempt | null) {
  if (!a) return { label: 'Belum mulai', cls: 'bg-muted text-muted-foreground' }
  if (a.status === 'submitted') return { label: 'Selesai', cls: 'bg-success/15 text-success' }
  if (a.entryActive) return { label: 'Mengerjakan', cls: 'bg-primary/15 text-primary' }
  return { label: 'Terkunci', cls: 'bg-destructive/15 text-destructive' }
}

/** Pemantauan siswa realtime (sinkron antar-tab pada mode percobaan). */
export function StudentMonitor({ className }: { className?: string }) {
  const rows = useStore(() => getStudents().map((s) => ({ s, a: getAttempt(s.username) })))
  const control = useStore(getControl)
  const now = useNow()
  const [resetFor, setResetFor] = useState<string | null>(null)

  const feed = (rows ?? [])
    .flatMap(({ s, a }) => (a?.violations ?? []).map((v) => ({ ...v, name: s.name })))
    .sort((x, y) => y.at - x.at)
    .slice(0, 15)

  return (
    <>
      <Panel title="Pemantauan siswa" icon={Users} className={className}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                <th className="pb-2 font-semibold">Siswa</th>
                <th className="pb-2 font-semibold">Status</th>
                <th className="pb-2 font-semibold">Progres</th>
                <th className="pb-2 font-semibold">Sisa waktu</th>
                <th className="pb-2 font-semibold">Pelanggaran</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map(({ s, a }) => {
                const st = statusOf(a)
                const answered = a ? Object.keys(a.answers).length : 0
                const total = a?.order.length ?? 0
                return (
                  <tr key={s.username} className="border-t border-border/60">
                    <td className="py-2.5">
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.username} · {s.kelas}</p>
                    </td>
                    <td><span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', st.cls)}>{st.label}</span></td>
                    <td className="w-32 pr-4">
                      {a ? (
                        <div>
                          <div className="neu-inset h-1.5 overflow-hidden rounded-full"><div className="h-full bg-primary" style={{ width: `${total ? (answered / total) * 100 : 0}%` }} /></div>
                          <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">{answered}/{total}</p>
                        </div>
                      ) : '–'}
                    </td>
                    <td className="font-mono text-xs tabular-nums">{a && control && a.status !== 'submitted' ? fmtClock(remainingMs(a, control, now)) : '–'}</td>
                    <td>
                      {a?.violations.length ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-destructive"><AlertTriangle className="size-3.5" /> {a.violations.length}</span>
                      ) : <span className="text-xs text-muted-foreground">0</span>}
                    </td>
                    <td className="text-right">
                      {a && (
                        <button type="button" onClick={() => setResetFor(s.username)} aria-label={`Reset ujian ${s.name}`} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:text-destructive">
                          <RotateCcw className="size-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <h3 className="mt-5 mb-2 text-xs font-bold text-muted-foreground uppercase">Log pelanggaran terbaru</h3>
        {feed.length === 0 ? (
          <p className="neu-inset rounded-xl p-3 text-xs text-muted-foreground">Belum ada pelanggaran tercatat.</p>
        ) : (
          <ul className="space-y-1.5">
            {feed.map((v) => (
              <li key={`${v.name}-${v.at}`} className="neu-inset flex items-center gap-3 rounded-xl px-3 py-2 text-xs">
                <span className="font-mono text-muted-foreground tabular-nums">{new Date(v.at).toLocaleTimeString('id-ID')}</span>
                <span className="font-semibold">{v.name}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground" title={v.detail}>{v.detail}</span>
                <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 font-bold text-destructive">{violationLabel[v.type] ?? v.type}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <ConfirmTwice
        open={!!resetFor}
        onOpenChange={(o) => !o && setResetFor(null)}
        title="Reset ujian siswa?"
        description="Jawaban, timer, dan hasil siswa ini akan dihapus sehingga ia dapat mengulang dari awal."
        finalTitle="Hapus seluruh progres siswa?"
        finalDescription="Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, reset"
        destructive
        onConfirm={() => {
          if (resetFor) resetAttempt(resetFor)
          toast.success('Ujian siswa direset.')
          setResetFor(null)
        }}
      />
    </>
  )
}
