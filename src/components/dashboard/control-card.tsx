import { PauseCircle, PlayCircle, ServerCrash, Activity } from 'lucide-react'
import { toast } from 'sonner'
import { Panel } from './shell'
import { getControl, pauseExam, resumeExam } from '@/lib/exam-store'
import { useNow, useStore, fmtClock } from '@/lib/use-store'
import { cn } from '@/lib/utils'

/** Jeda/lanjutkan ujian. Saat dijeda, timer semua siswa berhenti. */
export function ControlCard({ by, className }: { by: string; className?: string }) {
  const c = useStore(getControl)
  const now = useNow()
  const paused = !!c?.paused
  return (
    <Panel title="Kontrol ujian" icon={Activity} className={className}>
      <div className={cn('mb-4 flex items-center gap-3 rounded-xl p-3', paused ? 'bg-warning/15' : 'bg-success/10')}>
        <span className={cn('size-2.5 rounded-full', paused ? 'animate-pulse-soft bg-warning' : 'bg-success')} />
        <div className="text-sm">
          <p className="font-bold">{paused ? 'Ujian dijeda — timer berhenti' : 'Ujian berjalan normal'}</p>
          {paused && c?.pausedAt && (
            <p className="text-xs text-muted-foreground">{c.reason} · {fmtClock(now - c.pausedAt)} lalu oleh {c.by}</p>
          )}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {paused ? (
          <button type="button" onClick={() => { resumeExam(); toast.success('Ujian dilanjutkan.') }} className="flex items-center justify-center gap-2 rounded-xl bg-success px-3 py-2.5 text-sm font-bold text-white sm:col-span-2">
            <PlayCircle className="size-4" /> Lanjutkan ujian
          </button>
        ) : (
          <>
            <button type="button" onClick={() => pauseExam(`Ujian dijeda oleh ${by}.`, by)} className="neu-sm flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold">
              <PauseCircle className="size-4 text-warning" /> Jeda ujian
            </button>
            <button type="button" onClick={() => pauseExam('Terjadi gangguan server. Jawaban Anda aman.', 'sistem')} className="neu-sm flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold">
              <ServerCrash className="size-4 text-destructive" /> Tandai gangguan server
            </button>
          </>
        )}
      </div>
    </Panel>
  )
}
