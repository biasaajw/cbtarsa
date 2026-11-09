import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Loader2, UserRound } from 'lucide-react'
import { Brand } from '@/components/exam/brand'
import { PasswordInput, fieldClass } from '@/components/exam/password-input'
import { getAuth, homeFor, login } from '@/lib/exam-store'
import { ManualInput } from '@/lib/no-paste'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [shakeKey, setShakeKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const reason = sessionStorage.getItem('ua:logout-reason')
    if (reason) {
      setNotice(reason)
      sessionStorage.removeItem('ua:logout-reason')
    }
    const a = getAuth()
    if (a && a.role !== 'siswa') void navigate({ to: homeFor(a.role) })
  }, [navigate])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!username || !password) {
      setError('Isi username dan sandi terlebih dahulu.')
      setShakeKey((k) => k + 1)
      return
    }
    setLoading(true)
    // Peran ditentukan otomatis dari akun. Harus sama persis; spasi = tidak valid.
    setTimeout(() => {
      const s = login(username, password)
      setLoading(false)
      if (!s) {
        setError('Username atau sandi tidak valid.')
        setShakeKey((k) => k + 1)
        return
      }
      void navigate({ to: homeFor(s.role) })
    }, 350)
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <section aria-labelledby="login-title" className="neu animate-rise w-full max-w-sm p-6 sm:p-8">
        <div className="mb-6 flex justify-center">
          <Brand />
        </div>
        <h1 id="login-title" className="text-center text-2xl font-extrabold tracking-tight">Masuk</h1>

        {notice && (
          <div role="alert" className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {notice}
          </div>
        )}

        <form key={shakeKey} onSubmit={onSubmit} className={cn('mt-6 space-y-4', shakeKey > 0 && error && 'animate-shake')} noValidate>
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-sm font-semibold">Username</label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-muted-foreground" />
              <ManualInput
                id="username"
                autoCapitalize="none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ketik username"
                className={cn(fieldClass, 'pl-11')}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-semibold">Sandi</label>
            <PasswordInput
              id="password"
              autoCapitalize="none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ketik sandi"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground shadow-[0_8px_20px_-8px_var(--primary)] transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-70"
          >
            {loading ? <Loader2 className="size-5 animate-spin" /> : <>Masuk <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></>}
          </button>
        </form>
      </section>
    </main>
  )
}
