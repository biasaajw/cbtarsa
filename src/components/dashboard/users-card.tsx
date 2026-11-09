import { useState } from 'react'
import { Pencil, Trash2, UserPlus, Users2 } from 'lucide-react'
import { toast } from 'sonner'
import { Panel } from './shell'
import { ConfirmTwice } from '@/components/exam/confirm-twice'
import { PasswordInput, fieldClass } from '@/components/exam/password-input'
import { addUser, deleteUser, getUsers, updateUser, type ManagedRole } from '@/lib/exam-store'
import { useStore } from '@/lib/use-store'
import { cn } from '@/lib/utils'

interface Form {
  role: ManagedRole
  name: string
  kelas: string
  username: string
  password: string
}
const empty: Form = { role: 'siswa', name: '', kelas: '', username: '', password: '' }
const roleLabel = { siswa: 'Siswa', pengawas: 'Pengawas' } as const
const inputCls = cn(fieldClass, 'h-10 text-sm')

/** Admin: tambah, ubah, dan hapus akun siswa dan pengawas. */
export function UsersCard() {
  const users = useStore(getUsers)
  const [form, setForm] = useState<Form>(empty)
  const [editing, setEditing] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [toDelete, setToDelete] = useState<string | null>(null)

  const rows = (users ?? []).filter((u) => u.role !== 'admin')
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setError('')
    setForm((f) => ({ ...f, [k]: v }))
  }

  function reset() {
    setForm(empty)
    setEditing(null)
    setError('')
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const res = editing
      ? updateUser(editing, { name: form.name, kelas: form.kelas, password: form.password || undefined })
      : addUser(form)
    if (!res.ok) return setError(res.reason)
    toast.success(editing ? 'Akun diperbarui.' : 'Akun ditambahkan.')
    reset()
  }

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-5">
        <Panel title={editing ? `Ubah akun · ${editing}` : 'Tambah akun'} icon={UserPlus} className="lg:col-span-2">
          <form onSubmit={submit} className="space-y-3" noValidate>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold">Peran</span>
              <select
                value={form.role}
                disabled={!!editing}
                onChange={(e) => set('role', e.target.value as ManagedRole)}
                className={inputCls}
              >
                <option value="siswa">Siswa</option>
                <option value="pengawas">Pengawas</option>
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold">Nama lengkap</span>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
            </label>
            {form.role === 'siswa' && (
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold">Kelas</span>
                <input value={form.kelas} onChange={(e) => set('kelas', e.target.value)} placeholder="mis. XII IPA 1" className={inputCls} />
              </label>
            )}
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold">Username{editing ? ' (tidak dapat diubah)' : ''}</span>
              <input
                value={form.username}
                disabled={!!editing}
                autoCapitalize="none"
                onChange={(e) => set('username', e.target.value)}
                className={inputCls}
              />
            </label>
            <div className="space-y-1.5">
              <span className="block text-xs font-semibold">{editing ? 'Sandi baru (kosongkan jika tidak diganti)' : 'Sandi'}</span>
              <PasswordInput
                allowPaste
                autoCapitalize="none"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                className="h-10 text-sm"
              />
            </div>
            {error && <p role="alert" className="text-xs font-medium text-destructive">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="submit" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:brightness-110">
                {editing ? 'Simpan perubahan' : 'Tambah akun'}
              </button>
              {editing && (
                <button type="button" onClick={reset} className="neu-sm rounded-xl px-4 py-2.5 text-sm font-semibold">
                  Batal
                </button>
              )}
            </div>
          </form>
        </Panel>

        <Panel title={`Daftar akun (${rows.length})`} icon={Users2} className="lg:col-span-3">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                  <th className="pb-2 font-semibold">Nama</th>
                  <th className="pb-2 font-semibold">Username</th>
                  <th className="pb-2 font-semibold">Peran</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.username} className="border-t border-border/60">
                    <td className="py-2.5">
                      <p className="font-semibold">{u.name}</p>
                      {u.kelas && <p className="text-xs text-muted-foreground">{u.kelas}</p>}
                    </td>
                    <td className="font-mono text-xs">{u.username}</td>
                    <td className="text-xs">{roleLabel[u.role as ManagedRole]}</td>
                    <td className="text-right whitespace-nowrap">
                      <button
                        type="button"
                        aria-label={`Ubah ${u.name}`}
                        onClick={() => {
                          setEditing(u.username)
                          setForm({ role: u.role as ManagedRole, name: u.name, kelas: u.kelas ?? '', username: u.username, password: '' })
                          setError('')
                        }}
                        className="inline-grid size-8 place-items-center rounded-lg text-muted-foreground hover:text-primary"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Hapus ${u.name}`}
                        onClick={() => setToDelete(u.username)}
                        className="inline-grid size-8 place-items-center rounded-lg text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-xs text-muted-foreground">Belum ada akun siswa atau pengawas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Akun admin tidak dapat diubah atau dihapus dari sini.</p>
        </Panel>
      </div>

      <ConfirmTwice
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Hapus akun ini?"
        description="Akun, sesi ujian, dan hasil milik akun ini akan dihapus."
        finalTitle="Hapus akun secara permanen?"
        finalDescription="Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, hapus"
        destructive
        onConfirm={() => {
          if (toDelete) {
            const r = deleteUser(toDelete)
            if (r.ok) {
              toast.success('Akun dihapus.')
              if (editing === toDelete) reset()
            } else toast.error(r.reason)
          }
          setToDelete(null)
        }}
      />
    </>
  )
}
