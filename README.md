# UjiAman

Aplikasi ujian online berbasis web dengan tingkat keamanan ketat untuk mencegah kecurangan: 1. layar penuh yang dikunci. 2. deteksi pindah tab. 3. alarm suara, kamera aktif. 4. watermark username. 5. token ujian berkala. 6. soal acak per siswa. Tersedia halaman untuk siswa, pengawas, dan admin dengan satu form login — peran dikenali otomatis dari akun.

## Fitur
- **Login tunggal** dengan pratinjau sandi; peran (siswa/pengawas/admin) dikenali otomatis.
- **Persiapan ujian**: cek kamera, cek suara, dan token 6 karakter.
- **Pengerjaan**: layar penuh + kunci keyboard, keluar layar penuh/pindah tab/muat ulang = sesi terkunci, wajib login ulang dan token baru; alarm; blokir screenshot, salin-tempel, klik kanan, cetak; watermark; modul kamera; navigasi nomor ringkas; ragu-ragu; lewati; muat ulang per soal; soal bergambar; timer yang tetap berjalan saat keluar dan berhenti saat dijeda pengawas/gangguan server; konfirmasi 2 langkah untuk kumpul & keluar.
- **Hasil & analisis** per bagian, rincian jawaban, ekspor CSV/Excel.
- **Pengawas/Admin**: token otomatis tiap 5 menit (bisa diganti manual), jeda ujian, pemantauan siswa & log pelanggaran, reset siswa, bank soal dengan gambar, import soal dari .xlsx/.csv (Excel/Google Sheets) dan .docx/.txt (Word/Google Docs), pengaturan ujian.

## Akun percobaan
| Username | Sandi | Peran |
| --- | --- | --- |
| `admin` | `admin123` | Admin |
| `pengawas` | `awas123` | Pengawas |
| `siswa01` … `siswa04` | `siswa123` | Siswa |

Tip: buka Ruang Pengawas di jendela lain (profil/browser berbeda agar login tidak tertimpa) untuk melihat pemantauan langsung.

## Teknologi
TanStack Start (React 19, TanStack Router), Vite, Tailwind CSS 4, Radix UI/shadcn, lucide-react, sonner. Deploy di Netlify.

## Menjalankan secara lokal
```bash
pnpm install
pnpm dev   # http://localhost:3000
```
Kamera & layar penuh membutuhkan `localhost` atau HTTPS.

## Status & roadmap
Seluruh antarmuka sudah berfungsi di browser dengan data contoh yang disimpan di localStorage. Tahap berikutnya — database & migrasi (Netlify Database), autentikasi server, token & timer di server, pengawasan realtime, dan penyimpanan media — dijabarkan di [PLAN.md](PLAN.md).
