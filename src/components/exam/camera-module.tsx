import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, Minus, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CameraState = 'idle' | 'starting' | 'live' | 'denied' | 'ended'

/** Hook kamera: meminta akses webcam dan memantau bila stream berhenti. */
export function useCamera(enabled = true) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [state, setState] = useState<CameraState>('idle')

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setState('starting')
    navigator.mediaDevices
      ?.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' }, audio: false })
      .then((stream) => {
        if (cancelled) return stream.getTracks().forEach((t) => t.stop())
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setState('live')
        stream.getVideoTracks()[0]?.addEventListener('ended', () => setState('ended'))
      })
      .catch(() => !cancelled && setState('denied'))
    if (!navigator.mediaDevices) setState('denied')
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [enabled])

  // Pasang ulang stream jika elemen video dirender ulang.
  useEffect(() => {
    if (videoRef.current && streamRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current
    }
  })

  return { videoRef, state }
}

export function CameraPreview({
  videoRef,
  state,
  className,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>
  state: CameraState
  className?: string
}) {
  return (
    <div className={cn('relative overflow-hidden rounded-xl bg-foreground/90', className)}>
      <video ref={videoRef} autoPlay muted playsInline className="size-full -scale-x-100 object-cover" />
      {state !== 'live' && (
        <div className="absolute inset-0 grid place-items-center p-3 text-center text-xs text-white/80">
          {state === 'denied' || state === 'ended' ? (
            <span className="flex flex-col items-center gap-1.5">
              <CameraOff className="size-6" />
              {state === 'denied' ? 'Akses kamera ditolak' : 'Kamera terputus'}
            </span>
          ) : (
            <span className="animate-pulse-soft">Menyalakan kamera…</span>
          )}
        </div>
      )}
      {state === 'live' && (
        <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white">
          <span className="size-1.5 animate-pulse-soft rounded-full bg-red-500" /> REC
        </span>
      )}
    </div>
  )
}

/** Modul kamera melayang di halaman pengerjaan. */
export function CameraModule({
  videoRef,
  state,
  name,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>
  state: CameraState
  name: string
}) {
  const [min, setMin] = useState(false)
  return (
    <aside
      aria-label="Modul kamera pengawasan"
      className="neu fixed bottom-4 left-4 z-30 w-44 p-2 transition-all duration-300 sm:w-52"
    >
      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="flex items-center gap-1.5 text-[11px] font-bold">
          <Camera className={cn('size-3.5', state === 'live' ? 'text-success' : 'text-destructive')} />
          Kamera {state === 'live' ? 'aktif' : 'bermasalah'}
        </span>
        <button
          type="button"
          onClick={() => setMin((m) => !m)}
          aria-label={min ? 'Perbesar kamera' : 'Perkecil kamera'}
          className="grid size-6 place-items-center rounded-md text-muted-foreground hover:text-foreground"
        >
          {min ? <Maximize2 className="size-3.5" /> : <Minus className="size-3.5" />}
        </button>
      </div>
      <div className={cn('transition-all duration-300', min ? 'h-0 opacity-0' : 'h-28 opacity-100 sm:h-32')}>
        <CameraPreview videoRef={videoRef} state={state} className="size-full" />
      </div>
      {!min && <p className="mt-1.5 truncate px-1 text-[10px] text-muted-foreground">{name}</p>}
    </aside>
  )
}
