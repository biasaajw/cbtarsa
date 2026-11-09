/**
 * Import soal dari file: .xlsx / .csv (spreadsheet, termasuk ekspor Google Sheets)
 * dan .docx / .txt / teks tempel (Word, Google Docs).
 * .xlsx & .docx dibaca langsung di browser (ZIP + DecompressionStream) tanpa library tambahan.
 */
import type { Question } from './fixtures'

/* ---------------- ZIP reader minimal ---------------- */

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw')
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(ds)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function unzip(buf: ArrayBuffer, wanted: (name: string) => boolean) {
  const v = new DataView(buf)
  const bytes = new Uint8Array(buf)
  let eocd = -1
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('File bukan dokumen Office yang valid.')
  const count = v.getUint16(eocd + 10, true)
  let p = v.getUint32(eocd + 16, true)
  const dec = new TextDecoder()
  const out = new Map<string, string>()
  for (let n = 0; n < count; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) break
    const method = v.getUint16(p + 10, true)
    const csize = v.getUint32(p + 20, true)
    const nameLen = v.getUint16(p + 28, true)
    const extraLen = v.getUint16(p + 30, true)
    const commentLen = v.getUint16(p + 32, true)
    const local = v.getUint32(p + 42, true)
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen))
    p += 46 + nameLen + extraLen + commentLen
    if (!wanted(name)) continue
    const lNameLen = v.getUint16(local + 26, true)
    const lExtraLen = v.getUint16(local + 28, true)
    const start = local + 30 + lNameLen + lExtraLen
    const raw = bytes.subarray(start, start + csize)
    const data = method === 0 ? raw : method === 8 ? await inflateRaw(raw) : null
    if (data) out.set(name, dec.decode(data))
  }
  return out
}

const xml = (s: string) => new DOMParser().parseFromString(s, 'application/xml')
const byTag = (el: Document | Element, tag: string) => Array.from(el.getElementsByTagNameNS('*', tag))

/* ---------------- Spreadsheet ---------------- */

async function readXlsx(buf: ArrayBuffer): Promise<string[][]> {
  const files = await unzip(buf, (n) => n === 'xl/sharedStrings.xml' || /^xl\/worksheets\/sheet1\.xml$/.test(n))
  const shared = files.has('xl/sharedStrings.xml')
    ? byTag(xml(files.get('xl/sharedStrings.xml')!), 'si').map((si) => byTag(si, 't').map((t) => t.textContent ?? '').join(''))
    : []
  const sheet = files.get('xl/worksheets/sheet1.xml')
  if (!sheet) throw new Error('Sheet pertama tidak ditemukan.')
  const colIndex = (ref: string) => {
    const letters = ref.replace(/\d+/g, '')
    let n = 0
    for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
    return n - 1
  }
  return byTag(xml(sheet), 'row').map((row) => {
    const cells: string[] = []
    for (const c of byTag(row, 'c')) {
      const t = c.getAttribute('t')
      const vEl = byTag(c, 'v')[0]
      let val = ''
      if (t === 's') val = shared[Number(vEl?.textContent ?? -1)] ?? ''
      else if (t === 'inlineStr') val = byTag(c, 't').map((x) => x.textContent ?? '').join('')
      else val = vEl?.textContent ?? ''
      cells[colIndex(c.getAttribute('r') ?? 'A1')] = val
    }
    return Array.from(cells, (x) => x ?? '')
  })
}

function readCsv(text: string): string[][] {
  const delim = (text.split('\n')[0].match(/;/g)?.length ?? 0) > (text.split('\n')[0].match(/,/g)?.length ?? 0) ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let q = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') q = false
      else cell += ch
    } else if (ch === '"') q = true
    else if (ch === delim) { row.push(cell); cell = '' }
    else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = '' }
    else cell += ch
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows
}

/** Kolom: bagian, soal, A, B, C, D, E, kunci, gambar(opsional). Baris pertama = judul kolom. */
function rowsToQuestions(rows: string[][]): Question[] {
  const body = rows.filter((r) => r.some((c) => c.trim()))
  const first = body[0]?.map((c) => c.toLowerCase()) ?? []
  const start = first.some((c) => c.includes('soal') || c.includes('kunci') || c.includes('bagian')) ? 1 : 0
  return body.slice(start).flatMap((r, i) => {
    const [section, text, a, b, c, d, e, key, image] = r.map((x) => (x ?? '').trim())
    const opts = [a, b, c, d, e].filter(Boolean)
    const answer = (key ?? '').toUpperCase().slice(0, 1)
    if (!text || opts.length < 2 || !'ABCDE'.includes(answer) || !answer) return []
    return [{
      id: `imp-${Date.now().toString(36)}-${i}`,
      section: section || 'Umum',
      text,
      image: image || undefined,
      options: opts.map((t, j) => ({ key: 'ABCDE'[j], text: t })),
      answer,
    }]
  })
}

/* ---------------- Dokumen (teks) ---------------- */

async function readDocx(buf: ArrayBuffer): Promise<string> {
  const files = await unzip(buf, (n) => n === 'word/document.xml')
  const doc = files.get('word/document.xml')
  if (!doc) throw new Error('Isi dokumen tidak ditemukan.')
  return byTag(xml(doc), 'p')
    .map((p) => byTag(p, 't').map((t) => t.textContent ?? '').join(''))
    .join('\n')
}

/**
 * Format teks:
 *   [Matematika]
 *   1. Teks soal …
 *   A. opsi
 *   B. opsi
 *   Kunci: B
 *   Gambar: https://… (opsional)
 */
export function parseQuestionText(text: string): Question[] {
  const out: Question[] = []
  let section = 'Umum'
  let cur: { text: string; options: string[]; answer: string; image?: string } | null = null
  const flush = () => {
    if (cur && cur.text && cur.options.length >= 2 && cur.answer) {
      out.push({
        id: `imp-${Date.now().toString(36)}-${out.length}`,
        section,
        text: cur.text.trim(),
        image: cur.image,
        options: cur.options.map((t, j) => ({ key: 'ABCDE'[j], text: t })),
        answer: cur.answer,
      })
    }
    cur = null
  }
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    let m: RegExpMatchArray | null
    if ((m = line.match(/^\[(.+)\]$/)) || (m = line.match(/^bagian\s*:\s*(.+)$/i))) {
      flush()
      section = m[1].trim()
    } else if ((m = line.match(/^\d+\s*[.)]\s*(.+)$/))) {
      flush()
      cur = { text: m[1], options: [], answer: '' }
    } else if (cur && (m = line.match(/^([A-Ea-e])\s*[.)]\s*(.+)$/))) {
      cur.options.push(m[2])
    } else if (cur && (m = line.match(/^(kunci|jawaban)\s*[:=]\s*([A-Ea-e])/i))) {
      cur.answer = m[2].toUpperCase()
    } else if (cur && (m = line.match(/^gambar\s*:\s*(\S+)/i))) {
      cur.image = m[1]
    } else if (cur && cur.options.length === 0) {
      cur.text += ' ' + line
    }
  }
  flush()
  return out
}

export async function importQuestionsFromFile(file: File): Promise<Question[]> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xlsx')) return rowsToQuestions(await readXlsx(await file.arrayBuffer()))
  if (name.endsWith('.csv')) return rowsToQuestions(readCsv(await file.text()))
  if (name.endsWith('.docx')) return parseQuestionText(await readDocx(await file.arrayBuffer()))
  if (name.endsWith('.txt')) return parseQuestionText(await file.text())
  throw new Error('Format belum didukung. Gunakan .xlsx, .csv, .docx, atau .txt.')
}

export const CSV_TEMPLATE =
  'bagian,soal,A,B,C,D,E,kunci,gambar\n' +
  'Matematika,"Hasil dari 7 × 8 adalah …",54,56,58,64,72,B,\n' +
  'Fisika,"Satuan gaya dalam SI adalah …",Joule,Newton,Watt,Pascal,Volt,B,\n'

export const TEXT_TEMPLATE = `[Matematika]
1. Hasil dari 7 × 8 adalah …
A. 54
B. 56
C. 58
D. 64
Kunci: B

[Bahasa Indonesia]
2. Sinonim kata "cerdas" adalah …
A. pandai
B. malas
C. lambat
D. ragu
Kunci: A`
