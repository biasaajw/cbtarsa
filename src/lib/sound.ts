/** Bunyi peringatan via Web Audio API — volume aplikasi selalu maksimal. */
let ctx: AudioContext | null = null

export function getAudio() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new AC()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'square', gain = 0.9) {
  const ac = getAudio()
  if (!ac) return
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(gain, ac.currentTime + start)
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + start + dur)
  osc.connect(g).connect(ac.destination)
  osc.start(ac.currentTime + start)
  osc.stop(ac.currentTime + start + dur + 0.05)
}

/** Sirine keras saat siswa mencoba keluar paksa. */
export function playAlarm() {
  for (let i = 0; i < 6; i++) {
    tone(i % 2 ? 660 : 990, i * 0.22, 0.2, 'sawtooth', 1)
  }
}

/** Bip pendek untuk pintasan terlarang. */
export function playWarn() {
  tone(880, 0, 0.12, 'square', 0.6)
  tone(660, 0.14, 0.12, 'square', 0.6)
}

/** Nada uji speaker sebelum ujian dimulai. */
export function playTest() {
  tone(523, 0, 0.18, 'sine', 0.8)
  tone(659, 0.2, 0.18, 'sine', 0.8)
  tone(784, 0.4, 0.3, 'sine', 0.8)
}
