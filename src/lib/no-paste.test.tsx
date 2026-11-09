import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ManualInput } from './no-paste'

function Field() {
  const [v, setV] = useState('')
  return <ManualInput aria-label="isian" value={v} onChange={(e) => setV(e.target.value)} />
}

describe('ManualInput', () => {
  it('memblokir tempel, salin, potong, seret, dan menu klik kanan', () => {
    render(<Field />)
    const el = screen.getByLabelText('isian')
    for (const type of ['paste', 'copy', 'cut', 'drop', 'contextMenu'] as const) {
      const notPrevented = fireEvent[type](el)
      expect(notPrevented, type).toBe(false)
    }
  })
  it('memblokir Ctrl+V dan Shift+Insert', () => {
    render(<Field />)
    const el = screen.getByLabelText('isian')
    expect(fireEvent.keyDown(el, { key: 'v', ctrlKey: true })).toBe(false)
    expect(fireEvent.keyDown(el, { key: 'Insert', shiftKey: true })).toBe(false)
  })
  it('tetap menerima ketikan biasa', () => {
    render(<Field />)
    const el = screen.getByLabelText('isian') as HTMLInputElement
    fireEvent.change(el, { target: { value: 'siswa01' } })
    expect(el.value).toBe('siswa01')
    expect(fireEvent.keyDown(el, { key: 'a' })).toBe(true)
  })
})
