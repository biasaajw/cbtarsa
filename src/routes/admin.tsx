import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { ControlCard } from '@/components/dashboard/control-card'
import { QuestionBank } from '@/components/dashboard/question-bank'
import { ResultsCard } from '@/components/dashboard/results-card'
import { DashboardShell, Panel } from '@/components/dashboard/shell'
import { StudentMonitor } from '@/components/dashboard/student-monitor'
import { TokenCard } from '@/components/dashboard/token-card'
import { UsersCard } from '@/components/dashboard/users-card'
import { fieldClass } from '@/components/exam/password-input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getExam, saveExamSettings } from '@/lib/exam-store'
import type { ExamInfo } from '@/lib/fixtures'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

function AdminPage() {
  return (
    <DashboardShell role="admin" title="Panel Admin">
      {(auth) => (
        <Tabs defaultValue="ringkasan">
          <TabsList className="neu-inset mb-5 h-auto rounded-xl p-1">
            <TabsTrigger value="ringkasan" className="rounded-lg px-4 py-1.5">Ringkasan</TabsTrigger>
            <TabsTrigger value="soal" className="rounded-lg px-4 py-1.5">Bank soal</TabsTrigger>
            <TabsTrigger value="pengguna" className="rounded-lg px-4 py-1.5">Pengguna</TabsTrigger>
            <TabsTrigger value="pengaturan" className="rounded-lg px-4 py-1.5">Pengaturan</TabsTrigger>
          </TabsList>
          <TabsContent value="ringkasan">
            <div className="grid gap-5 lg:grid-cols-3">
              <TokenCard by={auth.name} className="lg:col-span-2" />
              <ControlCard by={auth.name} />
              <StudentMonitor className="lg:col-span-2" />
              <ResultsCard />
            </div>
          </TabsContent>
          <TabsContent value="soal">
            <QuestionBank />
          </TabsContent>
          <TabsContent value="pengguna">
            <UsersCard />
          </TabsContent>
          <TabsContent value="pengaturan">
            <SettingsCard />
          </TabsContent>
        </Tabs>
      )}
    </DashboardShell>
  )
}

function SettingsCard() {
  const [s, setS] = useState<ExamInfo | null>(null)
  useEffect(() => setS(getExam()), [])
  if (!s) return null

  return (
    <Panel title="Pengaturan ujian" icon={Settings2} className="max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Judul ujian" className="sm:col-span-2">
          <input value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} className={cn(fieldClass, 'h-10 text-sm')} />
        </Field>
        <Field label="Durasi (menit)">
          <input type="number" min={5} max={300} value={s.durationMinutes} onChange={(e) => setS({ ...s, durationMinutes: Number(e.target.value) })} className={cn(fieldClass, 'h-10 text-sm')} />
        </Field>
        <Field label="Interval ganti token (menit)">
          <input type="number" min={1} max={60} value={s.tokenIntervalMinutes} onChange={(e) => setS({ ...s, tokenIntervalMinutes: Number(e.target.value) })} className={cn(fieldClass, 'h-10 text-sm')} />
        </Field>
        <Toggle label="Acak urutan soal per siswa" checked={s.shuffleQuestions} onChange={(v) => setS({ ...s, shuffleQuestions: v })} />
        <Toggle label="Acak urutan pilihan jawaban" checked={s.shuffleOptions} onChange={(v) => setS({ ...s, shuffleOptions: v })} />
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Perubahan durasi dan pengacakan berlaku untuk siswa yang baru memulai ujian.</p>
      <button
        type="button"
        onClick={() => {
          saveExamSettings({
            title: s.title.trim() || 'Ujian',
            durationMinutes: Math.max(5, s.durationMinutes || 30),
            tokenIntervalMinutes: Math.max(1, s.tokenIntervalMinutes || 5),
            shuffleQuestions: s.shuffleQuestions,
            shuffleOptions: s.shuffleOptions,
          })
          toast.success('Pengaturan disimpan.')
        }}
        className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:brightness-110"
      >
        Simpan pengaturan
      </button>
    </Panel>
  )
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn('space-y-1.5', className)}>
      <span className="block text-xs font-semibold">{label}</span>
      {children}
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="neu-inset flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold">
      {label}
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}
