import { describe, expect, it } from 'vitest'
import { DROP_RATIO, MIN_LEVEL, goertzel, isVolumeLow } from './volume-guard'

function sine(amp: number, hz: number, fs = 44100, n = 4096) {
  const x = new Float32Array(n)
  for (let i = 0; i < n; i++) x[i] = amp * Math.sin((2 * Math.PI * hz * i) / fs)
  return x
}

describe('goertzel', () => {
  it('mengukur amplitudo nada 1 kHz', () => {
    expect(goertzel(sine(0.5, 1000), 44100, 1000)).toBeGreaterThan(0.45)
    expect(goertzel(sine(0.5, 1000), 44100, 1000)).toBeLessThan(0.55)
  })
  it('mengabaikan frekuensi lain', () => {
    expect(goertzel(sine(0.5, 3000), 44100, 1000)).toBeLessThan(0.02)
  })
  it('sinyal lebih pelan menghasilkan nilai lebih kecil', () => {
    expect(goertzel(sine(0.1, 1000), 44100, 1000)).toBeLessThan(goertzel(sine(0.5, 1000), 44100, 1000) / 3)
  })
})

describe('isVolumeLow', () => {
  it('menandai bila turun di bawah rasio kalibrasi', () => {
    expect(isVolumeLow(0.1 * DROP_RATIO - 0.001, 0.1)).toBe(true)
  })
  it('tidak menandai bila setara kalibrasi', () => {
    expect(isVolumeLow(0.09, 0.1)).toBe(false)
  })
  it('menandai senyap walau kalibrasi tidak ada', () => {
    expect(isVolumeLow(MIN_LEVEL / 2, 0)).toBe(true)
  })
})
