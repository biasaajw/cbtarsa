/** Helper layar penuh + kunci keyboard (Keyboard Lock API di Chromium). */
type KeyboardLock = { lock?: (keys?: string[]) => Promise<void>; unlock?: () => void }
const kb = () => (navigator as unknown as { keyboard?: KeyboardLock }).keyboard

export const isFullscreen = () => !!document.fullscreenElement

export async function enterSecureMode(): Promise<boolean> {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
    }
    // Mengunci Esc & pintasan sistem agar tidak mudah keluar dari layar penuh.
    await kb()?.lock?.(['Escape', 'Tab', 'MetaLeft', 'MetaRight', 'AltLeft', 'AltRight', 'F11']).catch(() => {})
    return true
  } catch {
    return false
  }
}

export async function exitSecureMode() {
  kb()?.unlock?.()
  if (document.fullscreenElement) await document.exitFullscreen().catch(() => {})
}
