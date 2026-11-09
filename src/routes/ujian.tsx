import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  AlertOctagon,
  ChevronLeft,
  ChevronRight,
  Flag,
  Grid3x3,
  Loader2,
  LogOut,
  PauseCircle,
  RotateCw,
  Send,
  SkipForward,
  Timer,
} from 'lucide-react'
import { toast } from 'sonner'
import { Brand } from '@/components/exam/brand'
import { CameraModule, useCamera } from '@/components/exam/camera-module'
import { ConfirmTwice } from '@/components/exam/confirm-twice'
import { Watermark } from '@/components/exam/watermark'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  getAttempt,
  getAuth,
  getControl,
  getExam,
  getQuestions,
  logout,
  recordViolation,
  remainingMs,
  saveAttempt,
  submitAttempt,
  subscribe,
  type Attempt,
  type AuthSession,
  type ExamControl,
  type ViolationType,
} from '@/lib/exam-store'
import type { Question } from '@/lib/fixtures'
import { exitSecureMode, isFullscreen } from '@/lib/secure-mode'
import { getAudio, playAlarm, playWarn } from '@/lib/sound'
import { fmtClock, useNow } from '@/lib/use-store'
import { useVolumeGuard, type VolumeEvent } from '@/lib/volume-guard'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/ujian')({
  component: ExamPage,
})

const LETTERS = 'ABCDE'

function ExamPage() {
  const navigate = useNavigate()
  const [auth, setAuth] = useState<AuthSession | null>(null)
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [control, setControl] = useState<ExamControl>(() => ({ paused: false, reason: '', by: '', pausedAt: null, pausedAccumMs: 0 }))
  const [questions, setQuestions] = useState<Question[]>([])
  const [locked, setLocked] = useState<string | null>(null)
  const [shield, setShield] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [reloadTick, setReloadTick] = useState(0)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [exitOpen, setExitOpen] = useState(false)
  const lockedRef = useRef(false)
  const leavingRef = useRef(false)
  const now = useNow(500)
  const cam = useCamera(!!attempt)
  const exam = useMemo(() => (attempt ? getExam() : null), [attempt])

  /* ---------- Guard & muat sesi ---------- */
  useEffect(() => {
    const a = getAuth()
    if (!a || a.role !== 'siswa') return void navigate({ to: '/' })
    if (!a.verified) return void navigate({ to: '/token' })
    const at = getAttempt(a.username)
    if (!at || at.status === 'submitted') return void navigate({ to: at ? '/hasil' : '/token' })
    if (!at.entryActive) return void navigate({ to: '/token' })
    setAuth(a)
    setAttempt(at)
    setQuestions(getQuestions())
    setControl(getControl())
    getAudio()
  }, [navigate])

  // Sinkron dengan perubahan kontrol dari pengawas/admin (jeda, gangguan server).
  useEffect(() => subscribe(() => setControl(getControl())), [])

  /* ---------- Penguncian sesi ---------- */
  const lockSession = useCallback(
    (type: ViolationType, detail: string) => {
      if (lockedRef.current || leavingRef.current || !auth) return
      lockedRef.current = true
      playAlarm()
      recordViolation(auth.username, type, detail, true)
      logout()
      sessionStorage.setItem(
        'ua:logout-reason',
        `Sesi ujian terkunci: ${detail}. Login ulang dan minta token baru kepada pengawas. Timer tetap berjalan.`,
      )
      setLocked(detail)
      void exitSecureMode()
    },
    [auth],
  )

  const warn = useCallback(
    (msg: string, type?: ViolationType) => {
      playWarn()
      toast.warning(msg, { id: 'warn' })
      if (type && auth) recordViolation(auth.username, type, msg, false)
    },
    [auth],
  )

  /* ---------- Pemantau volume (nada berkala + catat bila diturunkan) ---------- */
  const onVolume = useCallback(
    (ev: VolumeEvent) => {
      if (ev.kind === 'key') return warn(`Tombol volume ditekan (${ev.key}). Volume harus tetap penuh.`, 'tombol-volume')
      if (ev.kind === 'no-mic') return warn('Mikrofon pemantau volume tidak aktif. Izinkan mikrofon.', 'volume-turun')
      const pct = ev.baseline ? Math.round((ev.level / ev.baseline) * 100) : 0
      warn(`Volume terdeteksi turun (${pct}% dari kalibrasi). Naikkan ke maksimum.`, 'volume-turun')
    },
    [warn],
  )
  useVolumeGuard(!!auth && !!attempt && !locked, onVolume)

  /* ---------- Pengamanan browser ---------- */
  useEffect(() => {
    if (!auth || !attempt) return
    // Halaman dibuka tanpa layar penuh (mis. setelah muat ulang) = keluar dari mode aman.
    if (!isFullscreen()) {
      lockSession('muat-ulang', 'halaman dimuat ulang atau dibuka di luar layar penuh')
      return
    }

    const onFs = () => {
      if (!document.fullscreenElement) lockSession('keluar-layar-penuh', 'keluar dari layar penuh')
    }
    const onVis = () => {
      if (document.hidden) lockSession('pindah-tab', 'berpindah tab atau meminimalkan browser')
    }
    let blurTimer: ReturnType<typeof setTimeout> | undefined
    const onBlur = () => {
      setShield(true)
      blurTimer = setTimeout(() => {
        if (!document.hasFocus()) lockSession('kehilangan-fokus', 'berpindah ke aplikasi atau jendela lain')
      }, 600)
    }
    const onFocus = () => {
      clearTimeout(blurTimer)
      setShield(false)
    }
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const mod = e.ctrlKey || e.metaKey
      if (k === 'printscreen' || (e.metaKey && e.shiftKey && ['3', '4', '5', 's'].includes(k))) {
        e.preventDefault()
        void navigator.clipboard?.writeText('Screenshot tidak diizinkan').catch(() => {})
        setShield(true)
        setTimeout(() => setShield(false), 1500)
        warn('Screenshot diblokir dan dicatat.', 'screenshot')
        return
      }
      if (k === 'escape') {
        e.preventDefault()
        warn('Layar terkunci — tidak dapat keluar dari mode ujian.')
        return
      }
      const blocked =
        k === 'f12' || k === 'f5' || k === 'f11' ||
        (mod && ['c', 'v', 'x', 'p', 's', 'u', 'a', 'r', 'f', 'n', 't', 'w', 'tab'].includes(k)) ||
        (mod && e.shiftKey && ['i', 'j', 'c', 'k'].includes(k)) ||
        (e.altKey && (k === 'tab' || k === 'arrowleft' || k === 'arrowright'))
      if (blocked) {
        e.preventDefault()
        e.stopPropagation()
        warn('Pintasan keyboard ini diblokir selama ujian.', 'pintasan-terlarang')
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        void navigator.clipboard?.writeText('Screenshot tidak diizinkan').catch(() => {})
      }
    }
    const block = (e: Event) => {
      e.preventDefault()
      warn('Aksi ini tidak diizinkan selama ujian.')
    }
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (leavingRef.current) return
      e.preventDefault()
    }
    const onPageHide = () => {
      if (!leavingRef.current && !lockedRef.current) {
        recordViolation(auth.username, 'muat-ulang', 'menutup atau memuat ulang halaman', true)
      }
    }

    document.addEventListener('fullscreenchange', onFs)
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('keyup', onKeyUp, true)
    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('pagehide', onPageHide)
    const evs = ['contextmenu', 'copy', 'cut', 'paste', 'dragstart', 'selectstart'] as const
    evs.forEach((ev) => document.addEventListener(ev, block))
    return () => {
      clearTimeout(blurTimer)
      document.removeEventListener('fullscreenchange', onFs)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('keyup', onKeyUp, true)
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.removeEventListener('pagehide', onPageHide)
      evs.forEach((ev) => document.removeEventListener(ev, block))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.username, !!attempt, lockSession, warn])

  // Kamera wajib aktif.
  const camWarned = useRef(false)
  useEffect(() => {
    if ((cam.state === 'ended' || cam.state === 'denied') && !camWarned.current && auth) {
      camWarned.current = true
      warn('Kamera tidak aktif! Pengawas telah diberi tahu.', 'kamera-mati')
    }
  }, [cam.state, auth, warn])

  /* ---------- Timer ---------- */
  const remaining = attempt ? remainingMs(attempt, control, now) : 0
  const doSubmit = useCallback(
    (auto: boolean) => {
      if (!auth || leavingRef.current) return
      leavingRef.current = true
      submitAttempt(auth.username, auto)
      void exitSecureMode()
      void navigate({ to: '/hasil' })
    },
    [auth, navigate],
  )
  useEffect(() => {
    if (attempt && !locked && remaining <= 0) {
      toast.info('Waktu habis. Jawaban dikumpulkan otomatis.')
      doSubmit(true)
    }
  }, [remaining, attempt, locked, doSubmit])

  /* ---------- Jawaban ---------- */
  const update = useCallback((patch: Partial<Attempt>) => {
    setAttempt((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      saveAttempt(next)
      return next
    })
  }, [])

  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions])

  if (!auth || !attempt || !exam) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>
  }

  const total = attempt.order.length
  const idx = Math.min(attempt.current, total - 1)
  const qid = attempt.order[idx]
  const q = byId.get(qid)
  const isLast = idx === total - 1
  const answered = attempt.order.filter((id) => attempt.answers[id]).length
  const doubtCount = attempt.order.filter((id) => attempt.doubt[id]).length
  const unanswered = attempt.order.map((id, i) => (attempt.answers[id] ? null : i + 1)).filter((n): n is number => n !== null)
  const go = (i: number) => update({ current: Math.max(0, Math.min(total - 1, i)) })
  const low = remaining < 5 * 60_000

  function reloadQuestion() {
    setReloading(true)
    setTimeout(() => {
      setQuestions(getQuestions())
      setReloadTick((t) => t + 1)
      setReloading(false)
      toast.success(`Soal nomor ${idx + 1} dimuat ulang.`)
    }, 700)
  }

  return (
    <div className={cn('exam-secure min-h-screen pb-28', shield && '[&_main]:blur-xl')}>
      {/* ---------- Header ---------- */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-content items-center gap-3 px-4 py-2.5 sm:px-6">
          <Brand compact className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{exam.title}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {q?.section} · {answered}/{total} dijawab{doubtCount ? ` · ${doubtCount} ragu` : ''}
            </p>
          </div>

          <div
            role="timer"
            aria-label="Sisa waktu"
            className={cn(
              'neu-inset flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-sm font-bold tabular-nums transition-colors',
              control.paused ? 'text-warning' : low ? 'text-destructive' : 'text-foreground',
            )}
          >
            {control.paused ? <PauseCircle className="size-4" /> : <Timer className={cn('size-4', low && 'animate-pulse-soft')} />}
            {fmtClock(remaining)}
          </div>

          <QuestionNav attempt={attempt} byId={byId} current={idx} onGo={go} />

          <button
            type="button"
            onClick={() => setExitOpen(true)}
            aria-label="Keluar ujian"
            className="neu-sm grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:text-destructive"
          >
            <LogOut className="size-4" />
          </button>
        </div>
        <div className="h-0.5 bg-muted">
          <div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${(answered / total) * 100}%` }} />
        </div>
      </header>

      {/* ---------- Soal ---------- */}
      <main className="mx-auto max-w-reading px-4 pt-6 transition-[filter] duration-200 sm:px-6">
        {q ? (
          <article key={`${qid}-${reloadTick}`} className="neu animate-rise relative overflow-hidden p-5 sm:p-7" aria-labelledby="q-title">
            <Watermark text={`${auth.username} · ${auth.name}`} />
            <div className="relative z-10">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary text-base font-extrabold text-primary-foreground">{idx + 1}</span>
                  <div>
                    <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Soal {idx + 1} dari {total}</p>
                    <p className="text-xs font-semibold text-primary">{q.section}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={reloadQuestion}
                  disabled={reloading}
                  className="neu-sm flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-primary disabled:opacity-60"
                  title="Muat ulang soal ini jika gambar/teks bermasalah"
                >
                  <RotateCw className={cn('size-3.5', reloading && 'animate-spin')} /> Muat ulang soal
                </button>
              </div>

              {reloading ? (
                <div className="space-y-3" aria-busy>
                  <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-8/12 animate-pulse rounded bg-muted" />
                  {q.image && <div className="h-44 animate-pulse rounded-xl bg-muted" />}
                  {[0, 1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />)}
                </div>
              ) : (
                <>
                  <h1 id="q-title" className="text-[17px] leading-relaxed font-semibold">{q.text}</h1>
                  {q.image && (
                    <QuestionImage src={q.image} tick={reloadTick} onRetry={reloadQuestion} />
                  )}
                  <div role="radiogroup" aria-labelledby="q-title" className="mt-5 space-y-2.5">
                    {(attempt.optionOrder[q.id] ?? q.options.map((x) => x.key)).map((key, i) => {
                      const opt = q.options.find((x) => x.key === key)
                      if (!opt) return null
                      const selected = attempt.answers[q.id] === key
                      return (
                        <button
                          key={key}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={control.paused}
                          onClick={() => update({ answers: { ...attempt.answers, [q.id]: key } })}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                            selected ? 'neu-press bg-primary/10 font-semibold text-foreground' : 'neu-sm hover:-translate-y-px',
                          )}
                        >
                          <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold transition-colors', selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                            {LETTERS[i]}
                          </span>
                          {opt.text}
                        </button>
                      )
                    })}
                  </div>
                  {attempt.answers[q.id] && (
                    <button
                      type="button"
                      onClick={() => {
                        const rest = { ...attempt.answers }
                        delete rest[q.id]
                        update({ answers: rest })
                      }}
                      className="mt-3 text-xs font-semibold text-muted-foreground hover:text-destructive"
                    >
                      Hapus jawaban
                    </button>
                  )}
                </>
              )}
            </div>
          </article>
        ) : (
          <div className="neu p-8 text-center">
            <p className="font-semibold">Soal tidak dapat dimuat.</p>
            <button type="button" onClick={reloadQuestion} className="mt-3 text-sm font-semibold text-primary">Coba lagi</button>
          </div>
        )}
      </main>

      {/* ---------- Kontrol bawah ---------- */}
      <nav aria-label="Navigasi soal" className="fixed inset-x-0 bottom-0 z-20 border-t border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-reading items-center gap-2 px-4 py-3 sm:px-6">
          <button type="button" onClick={() => go(idx - 1)} disabled={idx === 0} className="neu-sm flex h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold transition disabled:opacity-40">
            <ChevronLeft className="size-4" /> <span className="hidden sm:inline">Sebelumnya</span>
          </button>
          <button
            type="button"
            aria-pressed={!!attempt.doubt[qid]}
            onClick={() => update({ doubt: { ...attempt.doubt, [qid]: !attempt.doubt[qid] } })}
            className={cn(
              'flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition',
              attempt.doubt[qid] ? 'bg-warning/90 text-foreground shadow-inner' : 'neu-sm',
            )}
          >
            <Flag className="size-4" /> Ragu-ragu
          </button>
          <div className="flex-1" />
          {!isLast && (
            <button type="button" onClick={() => go(idx + 1)} className="flex h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground" title="Lewati soal ini">
              <SkipForward className="size-4" /> <span className="hidden sm:inline">Lewati</span>
            </button>
          )}
          {isLast ? (
            <button type="button" onClick={() => setSubmitOpen(true)} className="flex h-11 items-center gap-2 rounded-xl bg-success px-4 text-sm font-bold text-white shadow-[0_8px_20px_-8px_var(--success)] transition hover:brightness-110">
              <Send className="size-4" /> Kumpulkan
            </button>
          ) : (
            <button type="button" onClick={() => go(idx + 1)} className="flex h-11 items-center gap-1 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:brightness-110">
              Berikutnya <ChevronRight className="size-4" />
            </button>
          )}
        </div>
      </nav>

      <CameraModule videoRef={cam.videoRef} state={cam.state} name={`${auth.name} · ${auth.kelas}`} />

      {/* ---------- Dialog ---------- */}
      <ConfirmTwice
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        title="Kumpulkan jawaban?"
        description="Periksa kembali ringkasan jawaban Anda sebelum mengumpulkan."
        finalTitle="Yakin ingin mengumpulkan sekarang?"
        finalDescription="Setelah dikumpulkan, jawaban tidak dapat diubah dan ujian selesai."
        confirmLabel="Ya, kumpulkan"
        onConfirm={() => doSubmit(false)}
      >
        <div className="grid grid-cols-3 gap-2 text-center">
          <Summary label="Dijawab" value={answered} tone="text-primary" />
          <Summary label="Kosong" value={total - answered} tone="text-destructive" />
          <Summary label="Ragu-ragu" value={doubtCount} tone="text-warning" />
        </div>
        {unanswered.length > 0 && (
          <div className="rounded-xl bg-destructive/10 p-3 text-xs">
            <p className="mb-2 font-semibold text-destructive">Belum dijawab:</p>
            <div className="flex flex-wrap gap-1.5">
              {unanswered.map((n) => (
                <button key={n} type="button" onClick={() => { setSubmitOpen(false); go(n - 1) }} className="grid size-7 place-items-center rounded-md bg-card font-bold hover:text-primary">
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}
      </ConfirmTwice>

      <ConfirmTwice
        open={exitOpen}
        onOpenChange={setExitOpen}
        title="Keluar dari ujian?"
        description="Jawaban tersimpan, tetapi timer tetap berjalan selama Anda di luar."
        finalTitle="Yakin keluar sekarang?"
        finalDescription="Untuk kembali, Anda wajib login ulang dan memasukkan token baru dari pengawas."
        confirmLabel="Ya, keluar"
        destructive
        onConfirm={() => {
          leavingRef.current = true
          saveAttempt({ ...attempt, entryActive: false, status: 'locked' })
          logout()
          void exitSecureMode()
          void navigate({ to: '/' })
        }}
      />

      {/* ---------- Overlay jeda ---------- */}
      {control.paused && !locked && (
        <div role="alertdialog" aria-label="Ujian dijeda" className="fixed inset-0 z-40 grid place-items-center bg-background/80 p-6 backdrop-blur-sm">
          <div className="neu animate-rise max-w-sm p-7 text-center">
            <PauseCircle className="mx-auto mb-3 size-12 text-warning" />
            <h2 className="text-xl font-extrabold">Ujian dijeda</h2>
            <p className="mt-2 text-sm text-muted-foreground">{control.reason || 'Dijeda oleh pengawas.'}</p>
            <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs font-semibold">Timer berhenti di {fmtClock(remaining)} — waktu Anda tidak berkurang.</p>
            <p className="mt-3 text-xs text-muted-foreground">Tetap di layar ini. Ujian lanjut otomatis.</p>
          </div>
        </div>
      )}

      {/* ---------- Overlay terkunci ---------- */}
      {locked && (
        <div role="alertdialog" aria-label="Sesi terkunci" className="fixed inset-0 z-50 grid place-items-center bg-destructive/95 p-6 text-white">
          <div className="animate-rise max-w-md text-center">
            <AlertOctagon className="mx-auto mb-4 size-16 animate-pulse-soft" />
            <h2 className="text-2xl font-extrabold">Sesi ujian terkunci</h2>
            <p className="mt-2 text-white/90">Terdeteksi: <b>{locked}</b>. Pelanggaran telah dicatat dan dilaporkan ke pengawas.</p>
            <p className="mt-3 text-sm text-white/80">Timer tetap berjalan. Login ulang lalu masukkan token baru dari pengawas untuk melanjutkan.</p>
            <button type="button" onClick={() => void navigate({ to: '/' })} className="mt-6 rounded-xl bg-white px-6 py-3 font-bold text-destructive transition hover:bg-white/90">
              Login ulang
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function QuestionImage({ src, tick, onRetry }: { src: string; tick: number; onRetry: () => void }) {
  const [failed, setFailed] = useState(false)
  const url = src.startsWith('data:') ? src : `${src}${src.includes('?') ? '&' : '?'}r=${tick}`
  if (failed) {
    return (
      <div className="mt-4 grid h-40 place-items-center rounded-xl bg-muted text-center text-sm text-muted-foreground">
        <div>
          Gambar gagal dimuat.
          <button type="button" onClick={onRetry} className="ml-1 font-semibold text-primary">Muat ulang</button>
        </div>
      </div>
    )
  }
  return (
    <div className="neu-inset mt-4 overflow-hidden rounded-xl p-2">
      <img src={url} alt="Gambar soal" draggable={false} onError={() => setFailed(true)} className="mx-auto max-h-72 w-auto rounded-lg" />
    </div>
  )
}

function Summary({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="neu-inset rounded-xl py-3">
      <p className={cn('text-2xl font-extrabold', tone)}>{value}</p>
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
    </div>
  )
}

/** Navigasi nomor soal yang ringkas di pojok kanan atas. */
function QuestionNav({
  attempt,
  byId,
  current,
  onGo,
}: {
  attempt: Attempt
  byId: Map<string, Question>
  current: number
  onGo: (i: number) => void
}) {
  const [open, setOpen] = useState(false)
  const sections = useMemo(() => {
    const m = new Map<string, number[]>()
    attempt.order.forEach((id, i) => {
      const s = byId.get(id)?.section ?? 'Lainnya'
      m.set(s, [...(m.get(s) ?? []), i])
    })
    return [...m.entries()]
  }, [attempt.order, byId])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Daftar nomor soal" className="neu-sm flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-xs font-bold">
          <Grid3x3 className="size-4 text-primary" />
          <span className="tabular-nums">{current + 1}/{attempt.order.length}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="neu w-72 border-0 p-3">
        <div className="space-y-2.5">
          {sections.map(([name, idxs]) => (
            <div key={name}>
              <p className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">{name}</p>
              <div className="grid grid-cols-8 gap-1">
                {idxs.map((i) => {
                  const id = attempt.order[i]
                  const ans = !!attempt.answers[id]
                  const doubt = !!attempt.doubt[id]
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        onGo(i)
                        setOpen(false)
                      }}
                      aria-current={i === current ? 'step' : undefined}
                      className={cn(
                        'grid size-7 place-items-center rounded-md text-[11px] font-bold transition-all',
                        doubt ? 'bg-warning text-foreground' : ans ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary',
                        i === current && 'ring-2 ring-ring ring-offset-1 ring-offset-card',
                      )}
                    >
                      {i + 1}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-border pt-2 text-[10px] font-semibold text-muted-foreground">
          <span className="flex items-center gap-1"><i className="size-2.5 rounded-sm bg-primary" /> Dijawab</span>
          <span className="flex items-center gap-1"><i className="size-2.5 rounded-sm bg-warning" /> Ragu-ragu</span>
          <span className="flex items-center gap-1"><i className="size-2.5 rounded-sm bg-muted ring-1 ring-border" /> Belum</span>
        </div>
      </PopoverContent>
    </Popover>
  )
}
