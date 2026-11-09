import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  BookOpenCheck,
  Check,
  KeyRound,
  Loader2,
  LogOut,
  Maximize,
  ShieldAlert,
  Volume2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Brand } from '@/components/exam/brand'
import { CameraPreview, useCamera } from '@/components/exam/camera-module'
import { IdentityGate } from '@/components/exam/identity-gate'
import {
  enterWithToken,
  getActiveToken,
  getAttempt,
  getAuth,
  getExam,
  getQuestions,
  logout,
  type AuthSession,
} from '@/lib/exam-store'
import { enterSecureMode, exitSecureMode } from '@/lib/secure-mode'
import { ManualInput } from '@/lib/no-paste'
import { useNow, useStore } from '@/lib/use-store'
import { calibrateVolume, stopMic } from '@/lib/volume-guard'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/token')({
  component: TokenPage,
})

function TokenPage() {
  const navigate = useNavigate()
  const [auth, setAuth] = useState<AuthSession | null>(null)
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [soundOk, setSoundOk] = useState(false)
  const [starting, setStarting] = useState(false)
  const [calibrating, setCalibrating] = useState(false)
  const [soundMsg, setSoundMsg] = useState('')
  const cam = useCamera(!!auth && !!auth.verified)
  const exam = useStore(getExam)
  const questionCount = useStore(() => getQuestions().length)
  const attempt = useStore(() => (auth ? getAttempt(auth.username) : null), [auth])
  const active = useStore(getActiveToken)
  const now = useNow()

  useEffect(() => {
    const a = getAuth()
    if (!a) return void navigate({ to: '/' })
    if (a.role !== 'siswa') return void navigate({ to: a.role === 'admin' ? '/admin' : '/pengawas' })
    if (getAttempt(a.username)?.status === 'submitted') return void navigate({ to: '/hasil' })
    setAuth(a)
  }, [navigate])

  // Rotasi otomatis saat token kedaluwarsa (5 menit).
  useEffect(() => {
    if (active && active.expiresAt <= now) getActiveToken()
  }, [active, now])

  if (!auth || !exam) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>
  }

  // Siswa wajib mengetik nama terdaftar sebelum menyiapkan ujian.
  if (auth.role === 'siswa' && !auth.verified) {
    return (
      <IdentityGate
        auth={auth}
        onVerified={() => setAuth(getAuth())}
        onCancel={() => void navigate({ to: '/' })}
      />
    )
  }

  const resuming = !!attempt && attempt.status !== 'submitted'
  const camOk = cam.state === 'live'
  const tokenFilled = token.trim().length === 6
  const ready = camOk && soundOk && tokenFilled

  async function runCalibration() {
    setCalibrating(true)
    setSoundMsg('')
    const r = await calibrateVolume()
    setCalibrating(false)
    if (r.ok) {
      setSoundOk(true)
      setSoundMsg('Volume terdeteksi baik. Jangan turunkan volume selama ujian.')
      return
    }
    setSoundOk(false)
    setSoundMsg(
      r.reason === 'no-mic'
        ? 'Izinkan akses mikrofon di browser untuk memeriksa volume, lalu coba lagi.'
        : 'Nada tidak terdengar jelas. Naikkan volume ke maksimum, lepas headphone, lalu coba lagi.',
    )
  }

  async function start() {
    if (!auth) return
    setError('')
    setStarting(true)
    // Layar penuh harus diminta langsung dari klik pengguna, baru token divalidasi.
    const ok = await enterSecureMode()
    if (!ok) {
      setStarting(false)
      toast.error('Browser menolak mode layar penuh. Izinkan layar penuh untuk memulai ujian.')
      return
    }
    const res = enterWithToken(auth.username, token)
    if (!res.ok) {
      setStarting(false)
      setError(res.reason)
      void exitSecureMode()
      return
    }
    void navigate({ to: '/ujian' })
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-content">
        <header className="mb-6 flex items-center justify-between">
          <Brand />
          <button
            type="button"
            onClick={() => {
              stopMic()
              logout()
              void navigate({ to: '/' })
            }}
            className="neu-sm flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-destructive"
          >
            <LogOut className="size-4" /> Keluar
          </button>
        </header>

        <div className="grid gap-5 lg:grid-cols-3">
          {/* Profil & info ujian */}
          <section className="neu animate-rise p-6 lg:col-span-2">
            <p className="text-sm text-muted-foreground">Selamat datang,</p>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{auth.name}</h1>
            <p className="text-sm text-muted-foreground">{auth.kelas} · @{auth.username}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Stat label="Ujian" value={exam.title} />
              <Stat label="Durasi" value={`${exam.durationMinutes} menit`} />
              <Stat label="Jumlah soal" value={`${questionCount ?? 0} soal`} />
            </div>

            <h2 className="mt-6 mb-3 text-sm font-bold">Bagian ujian</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {exam.sections.map((s, i) => (
                <div key={s.name} className="neu-inset flex items-start gap-3 rounded-xl p-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-sm font-bold text-primary">{i + 1}</span>
                  <div>
                    <p className="text-sm font-semibold">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {resuming && attempt && (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
                <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" />
                <div>
                  <p className="font-bold">Sesi Anda sebelumnya terhenti.</p>
                  <p className="text-muted-foreground">
                    Timer tetap berjalan selama Anda di luar. Masukkan <b>token baru</b> dari pengawas untuk melanjutkan
                    — token yang sudah Anda pakai tidak berlaku lagi. Pelanggaran tercatat: {attempt.violations.length}.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Kamera */}
          <section className="neu animate-rise p-5" style={{ animationDelay: '60ms' }}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">1 · Cek kamera</h2>
              <CheckBadge ok={camOk} />
            </div>
            <CameraPreview videoRef={cam.videoRef} state={cam.state} className="aspect-[4/3] w-full" />
            {cam.state === 'denied' && (
              <p className="mt-2 text-xs text-destructive">Izinkan akses kamera di browser lalu muat ulang halaman ini.</p>
            )}
          </section>

          {/* Volume */}
          <section className="neu animate-rise p-5" style={{ animationDelay: '100ms' }}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">2 · Cek volume penuh</h2>
              <CheckBadge ok={soundOk} />
            </div>
            <p className="text-sm text-muted-foreground">
              Naikkan volume perangkat ke <b>maksimum</b>. Aplikasi memutar nada lalu mendengarnya lewat
              mikrofon. Selama ujian volume dicek berkala dan nada berbunyi agar terdengar pengawas;
              menurunkan volume tercatat di log pengawas dan admin.
            </p>
            <button
              type="button"
              disabled={calibrating}
              onClick={runCalibration}
              className="neu-sm mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:neu-press disabled:opacity-60"
            >
              {calibrating ? <Loader2 className="size-4 animate-spin" /> : <Volume2 className="size-4 text-primary" />}
              Uji volume penuh
            </button>
            {soundMsg && (
              <p role="status" className={cn('mt-3 text-xs font-medium', soundOk ? 'text-success' : 'text-destructive')}>
                {soundMsg}
              </p>
            )}
          </section>

          {/* Token */}
          <section className="neu animate-rise p-5 lg:col-span-2" style={{ animationDelay: '140ms' }}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">3 · Token ujian</h2>
              <CheckBadge ok={tokenFilled} />
            </div>
            <label htmlFor="token" className="sr-only">Token ujian</label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <KeyRound className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
                <ManualInput
                  id="token"
                  value={token}
                  maxLength={6}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => {
                    setError('')
                    setToken(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                  }}
                  placeholder="6 karakter dari pengawas"
                  className="neu-inset h-14 w-full rounded-xl border-0 pr-4 pl-12 font-mono text-xl font-bold tracking-[0.35em] uppercase outline-none placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:tracking-normal focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <button
                type="button"
                disabled={!ready || starting}
                onClick={start}
                className="flex h-14 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-bold text-primary-foreground shadow-[0_8px_20px_-8px_var(--primary)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {starting ? <Loader2 className="size-5 animate-spin" /> : <Maximize className="size-5" />}
                {resuming ? 'Lanjutkan ujian' : 'Mulai ujian'}
              </button>
            </div>
            {error && <p role="alert" className="mt-2 text-sm font-medium text-destructive">{error}</p>}
            {!ready && (
              <p className="mt-2 text-xs text-muted-foreground">Selesaikan cek kamera, cek volume, dan ketik token untuk memulai.</p>
            )}
          </section>

          {/* Tata tertib */}
          <section className="neu animate-rise p-5" style={{ animationDelay: '180ms' }}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold"><BookOpenCheck className="size-4 text-primary" /> Tata tertib</h2>
            <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground">
              <li>• Ujian berjalan dalam layar penuh yang dikunci.</li>
              <li>• Keluar layar penuh, pindah tab/aplikasi, atau memuat ulang = sesi terkunci, login ulang + token baru.</li>
              <li>• Screenshot, salin-tempel, klik kanan, dan cetak diblokir. Semua isian harus diketik manual.</li>
              <li>• Volume harus penuh. Menurunkan volume tercatat di log pengawas dan admin.</li>
              <li>• Timer tetap berjalan meski Anda keluar; hanya berhenti bila pengawas menjeda.</li>
              <li>• Tombol kumpulkan hanya ada di soal terakhir.</li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="neu-inset rounded-xl p-3">
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-0.5 text-sm font-bold">{value}</p>
    </div>
  )
}

function CheckBadge({ ok }: { ok: boolean }) {
  return (
    <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold transition-colors', ok ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')}>
      {ok ? <><Check className="size-3" /> Siap</> : 'Belum'}
    </span>
  )
}
