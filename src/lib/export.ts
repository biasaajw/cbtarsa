import type { ExamResult } from './exam-store'

const fmtDuration = (ms: number) => {
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}d`
}

function rows(results: ExamResult[]) {
  const sectionNames = [...new Set(results.flatMap((r) => r.sections.map((s) => s.section)))]
  const header = [
    'Username', 'Nama', 'Kelas', 'Ujian', 'Nilai', 'Benar', 'Salah', 'Kosong', 'Ragu-ragu',
    'Jumlah Soal', ...sectionNames.map((s) => `Benar ${s}`), 'Durasi', 'Pelanggaran', 'Waktu Kumpul', 'Otomatis',
  ]
  const body = results.map((r) => [
    r.username, r.name, r.kelas, r.examTitle, r.score, r.correct, r.wrong, r.blank, r.doubt, r.total,
    ...sectionNames.map((n) => {
      const s = r.sections.find((x) => x.section === n)
      return s ? `${s.correct}/${s.total}` : '-'
    }),
    fmtDuration(r.durationUsedMs), r.violations,
    new Date(r.submittedAt).toLocaleString('id-ID'), r.autoSubmitted ? 'Ya' : 'Tidak',
  ])
  return [header, ...body]
}

function download(content: string, filename: string, type: string) {
  const blob = new Blob(['﻿' + content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')

export function exportCsv(results: ExamResult[], name = 'hasil-ujian') {
  const esc = (v: unknown) => {
    const s = String(v ?? '')
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = rows(results).map((r) => r.map(esc).join(',')).join('\r\n')
  download(csv, `${name}-${stamp()}.csv`, 'text/csv;charset=utf-8')
}

/** File .xls (SpreadsheetML/HTML) yang langsung terbuka di Excel & Google Sheets. */
export function exportExcel(results: ExamResult[], name = 'hasil-ujian') {
  const esc = (v: unknown) =>
    String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const [head, ...body] = rows(results)
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1"><thead><tr>${head
    .map((h) => `<th style="background:#3a5fc8;color:#fff">${esc(h)}</th>`)
    .join('')}</tr></thead><tbody>${body
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table></body></html>`
  download(html, `${name}-${stamp()}.xls`, 'application/vnd.ms-excel')
}

export { fmtDuration }
