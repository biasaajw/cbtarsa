import { useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { Brand } from '@/components/exam/brand'
import { fieldClass } from '@/components/exam/password-input'
import { confirmIdentity, logout, type AuthSession } from '@/lib/exam-store'
import { ManualInput } from '@/lib/no-paste'
import { cn } from '@/lib/utils'

const MAX_TRIES = 5

/** Langkah wajib setelah login siswa: ketik nama terdaftar (huruf besar/kecil bebas). */
export function IdentityGate({
  auth,
  onVerified,
  onCancel,
}: {
  auth: AuthSession
  onVerified: () => void
  onCancel: () => void
}) {
  const [typed, setTyped] = useState('')
  const [error, setError] = useState('')
  const [tries, setTries] = useState(0)
  const [busy, setBusy] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!typed) return setError('Ketik nama Anda terlebih dahulu.')
    setBusy(true)
    setTimeout(() => {
      setBusy(false)
      if (confirmIdentity(typed)) return onVerified()
      const n = tries + 1
      setTries(n)
      if (n >= MAX_TRIES) {
        logout()
        sessionStorage.setItem('ua:logout-reason', 'Konfirmasi nama gagal 5 kali. Silakan login ulang.')
        return onCancel()
      }
      setTyped('')
      setError(`Nama tidak sama. Ketik persis seperti yang tertera (sisa percobaan ${MAX_TRIES - n}).`)
    }, 250)
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <section className="neu animate-rise w-full max-w-md p-6 sm:p-8">
        <div className="mb-5 flex justify-center"><Brand /></div>
        <h1 className="flex items-center justify-center gap-2 text-center text-xl font-extrabold">
          <ShieldCheck className="size-5 text-primary" /> Konfirmasi identitas
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Ketik nama lengkap yang tertera di bawah ini. Huruf besar atau kecil bebas.
        </p>

        <p
          onCopy={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          className="neu-inset mt-5 rounded-xl px-4 py-3 text-center text-lg font-bold tracking-wide select-none"
        >
          {auth.name}
        </p>

        <form onSubmit={submit} className="mt-5 space-y-3" noValidate>
          <label htmlFor="confirm-name" className="sr-only">Ketik nama lengkap</label>
          <ManualInput
            id="confirm-name"
            value={typed}
            onChange={(e) => {
              setError('')
              setTyped(e.target.value)
            }}
            placeholder="Ketik nama Anda"
            autoCapitalize="none"
            className={cn(fieldClass, 'text-center')}
          />
          {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-70"
          >
            {busy ? <Loader2 className="size-5 animate-spin" /> : 'Konfirmasi'}
          </button>
          <button
            type="button"
            onClick={() => {
              logout()
              onCancel()
            }}
            className="w-full text-sm font-semibold text-muted-foreground hover:text-destructive"
          >
            Bukan saya — keluar
          </button>
        </form>
      </section>
    </main>
  )
}
