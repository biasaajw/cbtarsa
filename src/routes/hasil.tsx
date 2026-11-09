import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  CheckCircle2,
  Clock4,
  Download,
  FileSpreadsheet,
  Flag,
  Loader2,
  LogOut,
  MinusCircle,
  ShieldAlert,
  XCircle,
} from 'lucide-react'
import { Brand } from '@/components/exam/brand'
import { getAttempt, getAuth, getResults, logout, type Attempt, type ExamResult } from '@/lib/exam-store'
import { exportCsv, exportExcel, fmtDuration } from '@/lib/export'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/hasil')({
  component: ResultPage,
})

type Filter = 'semua' | 'benar' | 'salah' | 'kosong'

function ResultPage() {
  const navigate = useNavigate()
  const [result, setResult] = useState<ExamResult | null>(null)
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [filter, setFilter] = useState<Filter>('semua')

  useEffect(() => {
    const a = getAuth()
    if (!a || a.role !== 'siswa') return void navigate({ to: '/' })
    const r = getResults().find((x) => x.username === a.username)
    if (!r) return void navigate({ to: '/token' })
    setResult(r)
    setAttempt(getAttempt(a.username))
  }, [navigate])

  if (!result) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>
  }

  const grade = result.score >= 85 ? 'Sangat baik' : result.score >= 70 ? 'Baik' : result.score >= 55 ? 'Cukup' : 'Perlu belajar lagi'
  const strongest = [...result.sections].sort((a, b) => b.correct / b.total - a.correct / a.total)
  const reviewed = result.review.filter((r) =>
    filter === 'semua' ? true : filter === 'benar' ? r.correct : filter === 'kosong' ? !r.chosen : r.chosen && !r.correct,
  )

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-content">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Brand />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => exportCsv([result], `hasil-${result.username}`)} className="neu-sm flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition hover:text-primary">
              <Download className="size-4" /> CSV
            </button>
            <button type="button" onClick={() => exportExcel([result], `hasil-${result.username}`)} className="neu-sm flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition hover:text-success">
              <FileSpreadsheet className="size-4" /> Excel
            </button>
            <button
              type="button"
              onClick={() => {
                logout()
                void navigate({ to: '/' })
              }}
              className="flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
            >
              <LogOut className="size-4" /> Selesai
            </button>
          </div>
        </header>

        <div className="grid gap-5 md:grid-cols-4">
          {/* Nilai */}
          <section className="neu animate-rise flex flex-col items-center justify-center p-6 text-center md:col-span-2 md:row-span-2">
            <p className="text-sm font-semibold text-muted-foreground">{result.examTitle}</p>
            <ScoreRing score={result.score} />
            <h1 className="text-2xl font-extrabold">{grade}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {result.name} · {result.kelas} · dikumpulkan {new Date(result.submittedAt).toLocaleString('id-ID')}
              {result.autoSubmitted && ' (otomatis, waktu habis)'}
            </p>
          </section>

          <Tile icon={CheckCircle2} label="Benar" value={result.correct} tone="text-success" delay={40} />
          <Tile icon={XCircle} label="Salah" value={result.wrong} tone="text-destructive" delay={80} />
          <Tile icon={MinusCircle} label="Kosong" value={result.blank} tone="text-muted-foreground" delay={120} />
          <Tile icon={Flag} label="Ditandai ragu" value={result.doubt} tone="text-warning" delay={160} />

          {/* Per bagian */}
          <section className="neu animate-rise p-6 md:col-span-2" style={{ animationDelay: '200ms' }}>
            <h2 className="text-sm font-bold">Analisis per bagian</h2>
            <p className="mb-4 text-xs text-muted-foreground">Persentase jawaban benar di setiap bagian ujian.</p>
            <ul className="space-y-3.5">
              {result.sections.map((s) => {
                const pct = Math.round((s.correct / s.total) * 100)
                return (
                  <li key={s.section}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-semibold">{s.section}</span>
                      <span className="tabular-nums text-muted-foreground">{s.correct}/{s.total} · <b className="text-foreground">{pct}%</b></span>
                    </div>
                    <div className="neu-inset h-2.5 overflow-hidden rounded-full">
                      <div
                        className={cn('h-full rounded-full transition-[width] duration-700', pct >= 70 ? 'bg-primary' : pct >= 50 ? 'bg-warning' : 'bg-destructive')}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          {/* Insight */}
          <section className="neu animate-rise space-y-3 p-6 md:col-span-2" style={{ animationDelay: '240ms' }}>
            <h2 className="text-sm font-bold">Ringkasan</h2>
            <Insight icon={Clock4} title="Waktu pengerjaan" text={`${fmtDuration(result.durationUsedMs)} dari ${Math.round((attempt?.durationMs ?? 0) / 60000)} menit`} />
            {strongest.length > 0 && (
              <Insight icon={CheckCircle2} title="Bagian terkuat" text={`${strongest[0].section} (${strongest[0].correct}/${strongest[0].total} benar)`} />
            )}
            {strongest.length > 1 && (
              <Insight icon={XCircle} title="Perlu ditingkatkan" text={`${strongest[strongest.length - 1].section} — ulangi materi ${strongest[strongest.length - 1].section.toLowerCase()}`} />
            )}
            <Insight
              icon={ShieldAlert}
              title="Catatan integritas"
              text={result.violations ? `${result.violations} pelanggaran tercatat selama ujian` : 'Tidak ada pelanggaran — terima kasih sudah jujur!'}
              warn={result.violations > 0}
            />
          </section>

          {/* Pembahasan */}
          <section className="neu animate-rise p-6 md:col-span-4" style={{ animationDelay: '280ms' }}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-bold">Rincian jawaban</h2>
              <div role="tablist" className="neu-inset flex rounded-xl p-1 text-xs font-semibold">
                {(['semua', 'benar', 'salah', 'kosong'] as Filter[]).map((f) => (
                  <button key={f} role="tab" aria-selected={filter === f} type="button" onClick={() => setFilter(f)} className={cn('rounded-lg px-3 py-1.5 capitalize transition', filter === f ? 'neu-sm text-primary' : 'text-muted-foreground')}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            {reviewed.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada soal pada kategori ini.</p>
            ) : (
              <ol className="grid gap-3 md:grid-cols-2">
                {reviewed.map((r) => {
                  const no = result.review.indexOf(r) + 1
                  return (
                    <li key={r.id} className="neu-inset rounded-xl p-4">
                      <div className="mb-1.5 flex items-center gap-2 text-xs">
                        <span className={cn('grid size-6 place-items-center rounded-md font-bold text-white', r.correct ? 'bg-success' : r.chosen ? 'bg-destructive' : 'bg-muted-foreground')}>{no}</span>
                        <span className="font-semibold text-muted-foreground">{r.section}</span>
                      </div>
                      <p className="text-sm">{r.text}</p>
                      <p className="mt-2 text-xs"><span className="text-muted-foreground">Jawaban Anda: </span><b className={r.correct ? 'text-success' : 'text-destructive'}>{r.chosen ?? 'Tidak dijawab'}</b></p>
                      {!r.correct && <p className="text-xs"><span className="text-muted-foreground">Kunci: </span><b>{r.answer}</b></p>}
                    </li>
                  )
                })}
              </ol>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

function ScoreRing({ score }: { score: number }) {
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <div className="relative my-4 size-40">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--muted)" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke="var(--primary)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}
          className="transition-[stroke-dashoffset] duration-1000"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div>
          <p className="text-4xl font-extrabold tabular-nums">{score}</p>
          <p className="text-xs font-semibold text-muted-foreground">nilai</p>
        </div>
      </div>
    </div>
  )
}

function Tile({ icon: Icon, label, value, tone, delay }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone: string; delay: number }) {
  return (
    <div className="neu animate-rise p-5" style={{ animationDelay: `${delay}ms` }}>
      <Icon className={cn('size-5', tone)} />
      <p className={cn('mt-2 text-3xl font-extrabold tabular-nums', tone)}>{value}</p>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
    </div>
  )
}

function Insight({ icon: Icon, title, text, warn }: { icon: React.ComponentType<{ className?: string }>; title: string; text: string; warn?: boolean }) {
  return (
    <div className="neu-inset flex items-start gap-3 rounded-xl p-3">
      <Icon className={cn('mt-0.5 size-4 shrink-0', warn ? 'text-destructive' : 'text-primary')} />
      <div>
        <p className="text-xs font-bold">{title}</p>
        <p className="text-xs text-muted-foreground">{text}</p>
      </div>
    </div>
  )
}
