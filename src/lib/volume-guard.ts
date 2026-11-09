/**
 * Pemantau volume perangkat.
 *
 * Browser TIDAK bisa membaca atau mengunci volume sistem. Cara yang dipakai di sini:
 *  1. Saat persiapan, nada uji 1 kHz diputar pada volume aplikasi maksimum dan
 *     didengar lewat mikrofon -> hasilnya disimpan sebagai "kalibrasi".
 *  2. Selama ujian, nada yang sama diputar berkala (juga agar terdengar pengawas di ruangan)
 *     dan diukur lagi. Jika kuatnya turun jauh dari kalibrasi, dicatat sebagai pelanggaran.
 *  3. Tombol media AudioVolumeDown / AudioVolumeMute juga dicatat bila browser meneruskannya.
 * Batasan: headphone, ruangan sangat bising, atau mikrofon yang ditutup dapat memengaruhi hasil.
 */
import { useEffect, useRef } from 'react'
import { getAudio } from './sound'

export const TONE_HZ = 1000
export const BASELINE_KEY = 'ua:vol-baseline'
/** Amplitudo terendah (skala 0–1) yang dianggap "terdengar". Perlu disesuaikan setelah uji perangkat. */
export const MIN_LEVEL = 0.003
/** Sinyal di bawah rasio ini dari kalibrasi dianggap volume diturunkan (≈ -6 dB). */
export const DROP_RATIO = 0.5

let stream: MediaStream | null = null
let analyser: AnalyserNode | null = null
let source: MediaStreamAudioSourceNode | null = null

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Amplitudo komponen frekuensi `f` pada sampel `x` (algoritma Goertzel). */
export function goertzel(x: Float32Array, sampleRate: number, f: number) {
  const w = (2 * Math.PI * f) / sampleRate
  const c = 2 * Math.cos(w)
  let s1 = 0
  let s2 = 0
  for (let i = 0; i < x.length; i++) {
    const s = x[i] + c * s1 - s2
    s2 = s1
    s1 = s
  }
  const p = s1 * s1 + s2 * s2 - c * s1 * s2
  return (Math.sqrt(Math.max(0, p)) * 2) / x.length
}

/** Apakah hasil ukur terlalu pelan dibanding kalibrasi (atau di bawah ambang mutlak). */
export function isVolumeLow(level: number, baseline: number) {
  return level < Math.max(MIN_LEVEL, baseline * DROP_RATIO)
}

export async function startMic(): Promise<boolean> {
  if (stream?.active && analyser) return true
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    })
    const ac = getAudio()
    if (!ac) return false
    source = ac.createMediaStreamSource(stream)
    analyser = ac.createAnalyser()
    analyser.fftSize = 4096
    source.connect(analyser) // tidak disambungkan ke speaker
    return true
  } catch {
    stream = null
    return false
  }
}

export function stopMic() {
  stream?.getTracks().forEach((t) => t.stop())
  source?.disconnect()
  stream = null
  analyser = null
  source = null
}

/** Nada 1 kHz pada volume aplikasi maksimum. */
export function playBeep(durMs = 1200) {
  const ac = getAudio()
  if (!ac) return
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = 'sine'
  osc.frequency.value = TONE_HZ
  const t = ac.currentTime
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(1, t + 0.03)
  g.gain.setValueAtTime(1, t + durMs / 1000 - 0.05)
  g.gain.linearRampToValueAtTime(0.0001, t + durMs / 1000)
  osc.connect(g).connect(ac.destination)
  osc.start(t)
  osc.stop(t + durMs / 1000 + 0.02)
}

/** Memutar nada lalu mengukur kuatnya lewat mikrofon (puncak selama nada berbunyi). */
export async function measureTone(durMs = 1200): Promise<number> {
  const ac = getAudio()
  if (!ac || !analyser) return 0
  const buf = new Float32Array(analyser.fftSize)
  playBeep(durMs)
  let peak = 0
  const end = performance.now() + durMs + 200
  while (performance.now() < end) {
    await sleep(80)
    analyser.getFloatTimeDomainData(buf)
    peak = Math.max(peak, goertzel(buf, ac.sampleRate, TONE_HZ))
  }
  return peak
}

export type CalibrationResult =
  | { ok: true; level: number }
  | { ok: false; reason: 'no-mic' | 'too-quiet'; level: number }

/** Kalibrasi di halaman persiapan: mikrofon harus mendengar nada pada volume penuh. */
export async function calibrateVolume(): Promise<CalibrationResult> {
  if (!(await startMic())) return { ok: false, reason: 'no-mic', level: 0 }
  const a = await measureTone(1000)
  await sleep(300)
  const b = await measureTone(1000)
  const level = Math.max(a, b)
  if (level < MIN_LEVEL) return { ok: false, reason: 'too-quiet', level }
  try {
    sessionStorage.setItem(BASELINE_KEY, String(level))
  } catch {
    /* abaikan */
  }
  return { ok: true, level }
}

export interface VolumeEvent {
  kind: 'low' | 'key' | 'no-mic'
  level: number
  baseline: number
  key?: string
}

/** Selama ujian: bunyikan nada berkala dan laporkan bila volume turun. */
export function useVolumeGuard(enabled: boolean, onEvent: (e: VolumeEvent) => void) {
  const cb = useRef(onEvent)
  useEffect(() => {
    cb.current = onEvent
  })

  useEffect(() => {
    if (!enabled) return
    let stop = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const baseline = Number(sessionStorage.getItem(BASELINE_KEY) ?? 0) || 0

    void startMic().then((ok) => {
      if (stop) return
      if (!ok) {
        cb.current({ kind: 'no-mic', level: 0, baseline })
        return
      }
      const loop = async () => {
        if (stop) return
        const level = await measureTone(1200)
        if (stop) return
        if (isVolumeLow(level, baseline)) cb.current({ kind: 'low', level, baseline })
        timer = setTimeout(loop, 40_000 + Math.random() * 20_000)
      }
      timer = setTimeout(loop, 8_000)
    })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'AudioVolumeDown' || e.key === 'AudioVolumeMute') {
        cb.current({ kind: 'key', level: 0, baseline, key: e.key })
      }
    }
    window.addEventListener('keydown', onKey)

    return () => {
      stop = true
      if (timer) clearTimeout(timer)
      window.removeEventListener('keydown', onKey)
      stopMic()
    }
  }, [enabled])
}
