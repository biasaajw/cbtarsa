/** Watermark username berulang di latar soal untuk mencegah dokumentasi/penyebaran soal. */
export function Watermark({ text }: { text: string }) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='260' height='150'><text x='10' y='90' transform='rotate(-24 130 75)' font-family='sans-serif' font-size='17' font-weight='700' fill='rgba(58,95,200,0.075)'>${text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')}</text></svg>`
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 rounded-[inherit]"
      style={{ backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")` }}
    />
  )
}
