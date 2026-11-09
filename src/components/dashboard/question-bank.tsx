import { useRef, useState } from 'react'
import {
  FileUp,
  ImagePlus,
  Library,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Panel } from './shell'
import { ConfirmTwice } from '@/components/exam/confirm-twice'
import { fieldClass } from '@/components/exam/password-input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getExam, getQuestions, resetQuestions, saveQuestions } from '@/lib/exam-store'
import type { Question } from '@/lib/fixtures'
import {
  CSV_TEMPLATE,
  TEXT_TEMPLATE,
  importQuestionsFromFile,
  parseQuestionText,
} from '@/lib/question-import'
import { useStore } from '@/lib/use-store'
import { cn } from '@/lib/utils'

const LETTERS = 'ABCDE'

/** Mengecilkan gambar unggahan agar ringan sebelum disimpan. */
function resizeImage(file: File, max = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      const ctx = c.getContext('2d')
      if (!ctx) return reject(new Error('Canvas tidak tersedia'))
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, c.width, c.height)
      ctx.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(img.src)
      resolve(c.toDataURL('image/webp', 0.85))
    }
    img.onerror = () => reject(new Error('Gambar tidak dapat dibaca'))
    img.src = URL.createObjectURL(file)
  })
}

function download(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function QuestionBank({ className }: { className?: string }) {
  const questions = useStore(getQuestions) ?? []
  const sections = useStore(() => getExam().sections.map((s) => s.name)) ?? []
  const [filter, setFilter] = useState('Semua')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Question | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

  const allSections = [...new Set([...sections, ...questions.map((q) => q.section)])]
  const shown = questions.filter(
    (q) => (filter === 'Semua' || q.section === filter) && q.text.toLowerCase().includes(query.toLowerCase()),
  )

  const blank = (): Question => ({
    id: `q-${Date.now().toString(36)}`,
    section: allSections[0] ?? 'Umum',
    text: '',
    options: LETTERS.slice(0, 4).split('').map((key) => ({ key, text: '' })),
    answer: 'A',
  })

  return (
    <Panel
      title={`Bank soal · ${questions.length} soal`}
      icon={Library}
      className={className}
      action={
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setResetOpen(true)} className="neu-sm flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground" title="Kembalikan soal contoh">
            <RotateCcw className="size-3.5" /> Soal contoh
          </button>
          <button type="button" onClick={() => setImportOpen(true)} className="neu-sm flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold">
            <FileUp className="size-3.5 text-primary" /> Import
          </button>
          <button type="button" onClick={() => setEditing(blank())} className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-bold text-primary-foreground">
            <Plus className="size-3.5" /> Tambah soal
          </button>
        </div>
      }
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari soal…" className={cn(fieldClass, 'h-10 pl-9 text-sm')} />
        </div>
        <div className="neu-inset flex gap-1 overflow-x-auto rounded-xl p-1 text-xs font-semibold">
          {['Semua', ...allSections].map((s) => (
            <button key={s} type="button" onClick={() => setFilter(s)} className={cn('rounded-lg px-2.5 py-1.5 whitespace-nowrap transition', filter === s ? 'neu-sm text-primary' : 'text-muted-foreground')}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="neu-inset rounded-xl p-6 text-center text-sm text-muted-foreground">Tidak ada soal. Tambahkan atau import soal.</p>
      ) : (
        <ol className="grid gap-3 md:grid-cols-2">
          {shown.map((q) => (
            <li key={q.id} className="neu-inset flex gap-3 rounded-xl p-3">
              {q.image ? (
                <img src={q.image} alt="" className="size-16 shrink-0 rounded-lg bg-card object-contain" />
              ) : (
                <span className="grid size-16 shrink-0 place-items-center rounded-lg bg-card text-xs font-bold text-muted-foreground">Teks</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-primary">{q.section}</p>
                <p className="line-clamp-2 text-sm">{q.text}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{q.options.length} opsi · kunci {q.answer}</p>
              </div>
              <div className="flex flex-col gap-1">
                <button type="button" aria-label="Ubah soal" onClick={() => setEditing(q)} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:text-primary"><Pencil className="size-3.5" /></button>
                <button
                  type="button"
                  aria-label="Hapus soal"
                  onClick={() => {
                    saveQuestions(questions.filter((x) => x.id !== q.id))
                    toast('Soal dihapus.')
                  }}
                  className="grid size-7 place-items-center rounded-md text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {editing && (
        <QuestionEditor
          key={editing.id}
          initial={editing}
          sections={allSections}
          onClose={() => setEditing(null)}
          onSave={(q) => {
            const exists = questions.some((x) => x.id === q.id)
            saveQuestions(exists ? questions.map((x) => (x.id === q.id ? q : x)) : [...questions, q])
            toast.success(exists ? 'Soal diperbarui.' : 'Soal ditambahkan.')
            setEditing(null)
          }}
        />
      )}

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={(qs) => {
          saveQuestions([...questions, ...qs])
          toast.success(`${qs.length} soal berhasil diimport.`)
        }}
      />

      <ConfirmTwice
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Kembalikan soal contoh?"
        description="Bank soal diganti dengan 15 soal contoh bawaan."
        finalTitle="Hapus soal buatan sendiri?"
        finalDescription="Soal yang Anda tambah atau import akan hilang."
        confirmLabel="Ya, kembalikan"
        destructive
        onConfirm={() => {
          resetQuestions()
          toast.success('Soal contoh dipulihkan.')
        }}
      />
    </Panel>
  )
}

function QuestionEditor({
  initial,
  sections,
  onClose,
  onSave,
}: {
  initial: Question
  sections: string[]
  onClose: () => void
  onSave: (q: Question) => void
}) {
  const [q, setQ] = useState<Question>(initial)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const valid = q.text.trim() && q.options.filter((o) => o.text.trim()).length >= 2 && q.options.find((o) => o.key === q.answer)?.text.trim()

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="neu max-h-[90vh] overflow-y-auto border-0 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial.text ? 'Ubah soal' : 'Tambah soal'}</DialogTitle>
          <DialogDescription>Soal bisa berupa teks saja atau disertai gambar.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="q-section" className="text-xs font-semibold">Bagian</label>
            <input id="q-section" list="q-sections" value={q.section} onChange={(e) => setQ({ ...q, section: e.target.value })} className={cn(fieldClass, 'h-10 text-sm')} />
            <datalist id="q-sections">{sections.map((s) => <option key={s} value={s} />)}</datalist>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="q-text" className="text-xs font-semibold">Pertanyaan</label>
            <textarea id="q-text" rows={3} value={q.text} onChange={(e) => setQ({ ...q, text: e.target.value })} className={cn(fieldClass, 'h-auto py-3 text-sm')} />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold">Gambar (opsional)</p>
            {q.image ? (
              <div className="neu-inset relative rounded-xl p-2">
                <img src={q.image} alt="Pratinjau gambar soal" className="mx-auto max-h-48 rounded-lg" />
                <button type="button" aria-label="Hapus gambar" onClick={() => setQ({ ...q, image: undefined })} className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-card shadow"><X className="size-4" /></button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="neu-inset flex h-24 w-full flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold text-muted-foreground transition hover:text-primary">
                {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
                Unggah gambar (PNG, JPG, SVG)
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (!f) return
                setBusy(true)
                try {
                  setQ((prev) => ({ ...prev, image: undefined }))
                  const url = await resizeImage(f)
                  setQ((prev) => ({ ...prev, image: url }))
                } catch (err) {
                  toast.error((err as Error).message)
                } finally {
                  setBusy(false)
                }
              }}
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="mb-1.5 text-xs font-semibold">Pilihan jawaban · klik huruf untuk menandai kunci</legend>
            {q.options.map((o, i) => (
              <div key={o.key} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQ({ ...q, answer: o.key })}
                  aria-label={`Jadikan ${LETTERS[i]} kunci jawaban`}
                  aria-pressed={q.answer === o.key}
                  className={cn('grid size-10 shrink-0 place-items-center rounded-lg text-sm font-bold transition', q.answer === o.key ? 'bg-success text-white' : 'neu-sm text-muted-foreground')}
                >
                  {LETTERS[i]}
                </button>
                <input
                  value={o.text}
                  onChange={(e) => setQ({ ...q, options: q.options.map((x) => (x.key === o.key ? { ...x, text: e.target.value } : x)) })}
                  placeholder={`Opsi ${LETTERS[i]}`}
                  className={cn(fieldClass, 'h-10 text-sm')}
                />
                {q.options.length > 2 && (
                  <button
                    type="button"
                    aria-label={`Hapus opsi ${LETTERS[i]}`}
                    onClick={() => {
                      const opts = q.options.filter((x) => x.key !== o.key).map((x, j) => ({ ...x, key: LETTERS[j] }))
                      const oldIdx = q.options.findIndex((x) => x.key === q.answer)
                      const newIdx = oldIdx > i ? oldIdx - 1 : oldIdx === i ? 0 : oldIdx
                      setQ({ ...q, options: opts, answer: LETTERS[newIdx] })
                    }}
                    className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            ))}
            {q.options.length < 5 && (
              <button type="button" onClick={() => setQ({ ...q, options: [...q.options, { key: LETTERS[q.options.length], text: '' }] })} className="text-xs font-semibold text-primary">
                + Tambah opsi
              </button>
            )}
          </fieldset>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button disabled={!valid || busy} onClick={() => onSave({ ...q, options: q.options.filter((o) => o.text.trim()).map((o) => ({ ...o, text: o.text.trim() })) })}>
            Simpan soal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ImportDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onImport: (qs: Question[]) => void
}) {
  const [parsed, setParsed] = useState<Question[] | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setParsed(null)
    setText('')
    setError('')
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o) }}>
      <DialogContent className="neu max-h-[90vh] overflow-y-auto border-0 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import soal otomatis</DialogTitle>
          <DialogDescription>
            Unggah spreadsheet (.xlsx / .csv dari Excel atau Google Sheets) atau dokumen (.docx dari Word / Google Docs, .txt). Soal langsung terbaca.
          </DialogDescription>
        </DialogHeader>

        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="neu-inset flex h-28 w-full flex-col items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-muted-foreground transition hover:text-primary">
          {busy ? <Loader2 className="size-6 animate-spin" /> : <FileUp className="size-6" />}
          Pilih file .xlsx, .csv, .docx, atau .txt
        </button>
        <input
          ref={fileRef}
          type="file"
          hidden
          accept=".xlsx,.csv,.docx,.txt"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f) return
            setBusy(true)
            setError('')
            try {
              const qs = await importQuestionsFromFile(f)
              setParsed(qs)
              if (!qs.length) setError('Tidak ada soal yang terbaca. Periksa format menggunakan template di bawah.')
            } catch (err) {
              setError((err as Error).message)
            } finally {
              setBusy(false)
            }
          }}
        />

        <div className="space-y-1.5">
          <label htmlFor="import-text" className="text-xs font-semibold">…atau tempel teks dari Google Docs / Word</label>
          <textarea
            id="import-text"
            rows={6}
            value={text}
            placeholder={TEXT_TEMPLATE}
            onChange={(e) => {
              setText(e.target.value)
              setError('')
              setParsed(e.target.value.trim() ? parseQuestionText(e.target.value) : null)
            }}
            className={cn(fieldClass, 'h-auto py-3 font-mono text-xs')}
          />
        </div>

        <div className="flex flex-wrap gap-3 text-xs">
          <button type="button" onClick={() => download('﻿' + CSV_TEMPLATE, 'template-soal.csv', 'text/csv')} className="font-semibold text-primary hover:underline">Unduh template spreadsheet (.csv)</button>
          <button type="button" onClick={() => download(TEXT_TEMPLATE, 'template-soal.txt', 'text/plain')} className="font-semibold text-primary hover:underline">Unduh template dokumen (.txt)</button>
        </div>

        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
        {parsed && parsed.length > 0 && (
          <div className="neu-inset rounded-xl p-3 text-xs">
            <p className="mb-2 font-bold text-success">{parsed.length} soal siap diimport</p>
            <ul className="max-h-32 space-y-1 overflow-y-auto text-muted-foreground">
              {parsed.map((q, i) => <li key={q.id} className="truncate">{i + 1}. [{q.section}] {q.text}</li>)}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false) }}>Batal</Button>
          <Button
            disabled={!parsed?.length}
            onClick={() => {
              if (parsed) onImport(parsed)
              reset()
              onOpenChange(false)
            }}
          >
            Tambahkan {parsed?.length ?? 0} soal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
