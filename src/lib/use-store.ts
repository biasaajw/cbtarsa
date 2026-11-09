import { useEffect, useState } from 'react'
import { subscribe } from './exam-store'

/** True setelah komponen ter-mount di browser (aman membaca localStorage). */
export function useMounted() {
  const [m, setM] = useState(false)
  useEffect(() => setM(true), [])
  return m
}

/** Membaca nilai dari store stub dan memperbaruinya saat ada perubahan (termasuk dari tab lain). */
export function useStore<T>(getter: () => T, deps: unknown[] = []): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined)
  useEffect(() => {
    const update = () => setValue(getter())
    update()
    return subscribe(update)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return value
}

/** Detak setiap `ms` milidetik untuk timer. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}

export const fmtClock = (ms: number) => {
  const s = Math.ceil(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
