import type { ClipboardEvent, ComponentProps, DragEvent, FormEvent, KeyboardEvent, MouseEvent } from 'react'

/**
 * Pengaman input: nilai harus diketik manual, tidak bisa disalin, dipotong, ditempel,
 * atau diseret ke kolom. Dipakai di login, konfirmasi nama, dan token.
 * (Isian otomatis browser / saran papan klip keyboard HP tidak selalu bisa dicegah.)
 */
const block = (e: { preventDefault: () => void }) => e.preventDefault()

const PASTE_TYPES = new Set([
  'insertFromPaste',
  'insertFromPasteAsQuotation',
  'insertFromDrop',
  'insertFromYank',
])

export const manualOnlyProps = {
  onPaste: (e: ClipboardEvent) => block(e),
  onCopy: (e: ClipboardEvent) => block(e),
  onCut: (e: ClipboardEvent) => block(e),
  onDrop: (e: DragEvent) => block(e),
  onContextMenu: (e: MouseEvent) => block(e),
  onBeforeInput: (e: FormEvent<HTMLInputElement>) => {
    const t = (e.nativeEvent as InputEvent).inputType
    if (t && PASTE_TYPES.has(t)) e.preventDefault()
  },
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
    const mod = e.ctrlKey || e.metaKey
    const k = e.key.toLowerCase()
    if ((mod && ['v', 'c', 'x'].includes(k)) || (e.shiftKey && k === 'insert')) e.preventDefault()
  },
  autoComplete: 'off',
  autoCorrect: 'off',
  spellCheck: false,
} as const

/** `<input>` yang hanya menerima ketikan manual. */
export function ManualInput({ onKeyDown, ...props }: ComponentProps<'input'>) {
  return (
    <input
      {...props}
      {...manualOnlyProps}
      onKeyDown={(e) => {
        manualOnlyProps.onKeyDown(e)
        onKeyDown?.(e)
      }}
    />
  )
}
