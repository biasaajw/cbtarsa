import { BarChart3, Download, FileSpreadsheet } from 'lucide-react'
import { Panel } from './shell'
import { getResults } from '@/lib/exam-store'
import { exportCsv, exportExcel, fmtDuration } from '@/lib/export'
import { useStore } from '@/lib/use-store'

/** Rekap hasil semua siswa + ekspor CSV/Excel. */
export function ResultsCard({ className }: { className?: string }) {
  const results = useStore(getResults) ?? []
  const avg = results.length ? results.reduce((s, r) => s + r.score, 0) / results.length : 0
  const best = results.reduce((m, r) => Math.max(m, r.score), 0)
  return (
    <Panel
      title="Hasil ujian"
      icon={BarChart3}
      className={className}
      action={
        <div className="flex gap-1.5">
          <button type="button" disabled={!results.length} onClick={() => exportCsv(results)} className="neu-sm flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40">
            <Download className="size-3.5" /> CSV
          </button>
          <button type="button" disabled={!results.length} onClick={() => exportExcel(results)} className="neu-sm flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40">
            <FileSpreadsheet className="size-3.5 text-success" /> Excel
          </button>
        </div>
      }
    >
      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        {[
          ['Terkumpul', results.length],
          ['Rata-rata', avg.toFixed(1)],
          ['Tertinggi', best],
        ].map(([l, v]) => (
          <div key={l} className="neu-inset rounded-xl py-2.5">
            <p className="text-xl font-extrabold tabular-nums">{v}</p>
            <p className="text-[11px] font-semibold text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>
      {results.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground">Belum ada siswa yang mengumpulkan.</p>
      ) : (
        <ul className="space-y-1.5">
          {[...results].sort((a, b) => b.score - a.score).map((r) => (
            <li key={r.username} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm">
              <span className="min-w-0 flex-1 truncate font-semibold">{r.name}</span>
              <span className="text-xs text-muted-foreground">{fmtDuration(r.durationUsedMs)}</span>
              <span className="w-12 text-right font-bold tabular-nums text-primary">{r.score}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
