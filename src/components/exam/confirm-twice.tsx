import { useEffect, useState } from 'react'
import { AlertTriangle, ShieldAlert } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

/** Konfirmasi dua langkah untuk aksi penting (kumpulkan & keluar). */
export function ConfirmTwice({
  open,
  onOpenChange,
  title,
  description,
  children,
  finalTitle,
  finalDescription,
  confirmLabel,
  destructive,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description: string
  children?: React.ReactNode
  finalTitle: string
  finalDescription: string
  confirmLabel: string
  destructive?: boolean
  onConfirm: () => void
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (open) setStep(1)
  }, [open])

  // Jeda singkat sebelum tombol final aktif agar tidak tertekan dua kali tanpa sengaja.
  useEffect(() => {
    if (step !== 2) return setArmed(false)
    const t = setTimeout(() => setArmed(true), 900)
    return () => clearTimeout(t)
  }, [step])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="neu border-0 sm:max-w-md" showCloseButton={false}>
        {step === 1 ? (
          <div key="s1" className="animate-rise space-y-4">
            <DialogHeader>
              <div className="mb-1 flex items-center gap-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                <span className="grid size-5 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground">1</span>
                Langkah 1 dari 2
              </div>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="size-5 text-warning" /> {title}
              </DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            {children}
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
              <Button onClick={() => setStep(2)}>Lanjutkan</Button>
            </DialogFooter>
          </div>
        ) : (
          <div key="s2" className="animate-rise space-y-4">
            <DialogHeader>
              <div className="mb-1 flex items-center gap-2 text-xs font-bold tracking-wider text-destructive uppercase">
                <span className="grid size-5 place-items-center rounded-full bg-destructive text-[10px] text-white">2</span>
                Konfirmasi terakhir
              </div>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <ShieldAlert className="size-5 text-destructive" /> {finalTitle}
              </DialogTitle>
              <DialogDescription>{finalDescription}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>Kembali</Button>
              <Button
                variant={destructive ? 'destructive' : 'default'}
                disabled={!armed}
                onClick={() => {
                  onOpenChange(false)
                  onConfirm()
                }}
              >
                {armed ? confirmLabel : 'Tunggu…'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
