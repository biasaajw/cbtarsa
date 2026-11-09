import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { manualOnlyProps } from '@/lib/no-paste'
import { cn } from '@/lib/utils'

/**
 * Kolom sandi dengan tombol pratinjau (lihat/sembunyikan).
 * Secara bawaan sandi harus diketik manual (tidak bisa ditempel/disalin).
 * Panel admin boleh mengaktifkan `allowPaste` untuk mengisi sandi akun baru.
 */
export function PasswordInput({
  className,
  allowPaste = false,
  ...props
}: Omit<React.ComponentProps<'input'>, 'type'> & { allowPaste?: boolean }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        {...(allowPaste ? {} : manualOnlyProps)}
        {...props}
        autoComplete={allowPaste ? props.autoComplete : 'new-password'}
        type={show ? 'text' : 'password'}
        className={cn(
          'neu-inset h-12 w-full rounded-xl border-0 pr-12 pl-4 text-[15px] outline-none transition-shadow placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring',
          show && 'font-mono tracking-wide',
          className,
        )}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Sembunyikan sandi' : 'Lihat sandi'}
        aria-pressed={show}
        className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  )
}

export const fieldClass =
  'neu-inset h-12 w-full rounded-xl border-0 px-4 text-[15px] outline-none transition-shadow placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring'
