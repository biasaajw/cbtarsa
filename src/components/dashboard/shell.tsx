import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, LogOut } from 'lucide-react'
import { Brand } from '@/components/exam/brand'
import { getAuth, homeFor, logout, type AuthSession } from '@/lib/exam-store'
import type { Role } from '@/lib/fixtures'

/** Guard + kerangka halaman dashboard admin/pengawas. */
export function DashboardShell({
  role,
  title,
  children,
}: {
  role: Exclude<Role, 'siswa'>
  title: string
  children: (auth: AuthSession) => React.ReactNode
}) {
  const navigate = useNavigate()
  const [auth, setAuth] = useState<AuthSession | null>(null)

  useEffect(() => {
    const a = getAuth()
    if (!a) return void navigate({ to: '/' })
    if (a.role !== role) return void navigate({ to: homeFor(a.role) })
    setAuth(a)
  }, [navigate, role])

  if (!auth) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-content">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Brand />
            <span className="hidden h-8 w-px bg-border sm:block" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-extrabold tracking-tight">{title}</h1>
              <p className="text-xs text-muted-foreground">{auth.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              logout()
              void navigate({ to: '/' })
            }}
            className="neu-sm flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-destructive"
          >
            <LogOut className="size-4" /> Keluar
          </button>
        </header>
        <h1 className="mb-4 text-xl font-extrabold sm:hidden">{title}</h1>
        {children(auth)}
      </div>
    </div>
  )
}

export function Panel({
  title,
  icon: Icon,
  action,
  className = '',
  delay = 0,
  children,
}: {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  action?: React.ReactNode
  className?: string
  delay?: number
  children: React.ReactNode
}) {
  return (
    <section className={`neu animate-rise p-5 ${className}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          {Icon && <Icon className="size-4 text-primary" />} {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}
