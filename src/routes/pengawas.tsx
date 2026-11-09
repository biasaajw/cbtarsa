import { createFileRoute } from '@tanstack/react-router'
import { ControlCard } from '@/components/dashboard/control-card'
import { ResultsCard } from '@/components/dashboard/results-card'
import { DashboardShell } from '@/components/dashboard/shell'
import { StudentMonitor } from '@/components/dashboard/student-monitor'
import { TokenCard } from '@/components/dashboard/token-card'

export const Route = createFileRoute('/pengawas')({
  component: () => (
    <DashboardShell role="pengawas" title="Ruang Pengawas">
      {(auth) => (
        <div className="grid gap-5 lg:grid-cols-3">
          <TokenCard by={auth.name} className="lg:col-span-2" />
          <ControlCard by={auth.name} />
          <StudentMonitor className="lg:col-span-2" />
          <ResultsCard />
        </div>
      )}
    </DashboardShell>
  ),
})
