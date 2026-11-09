import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Brand({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="neu-sm grid size-9 place-items-center rounded-xl text-primary">
        <ShieldCheck className="size-5" aria-hidden />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-base font-extrabold tracking-tight">UjiAman</span>
          <span className="block text-[11px] font-medium text-muted-foreground">Browser Ujian Aman</span>
        </span>
      )}
    </div>
  )
}
