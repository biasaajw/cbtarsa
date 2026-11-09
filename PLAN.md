# UjiAman — Roadmap

UjiAman adalah browser ujian online dengan pengamanan ketat. Pengembangan dibagi ke beberapa milestone kecil yang masing-masing bisa dikerjakan dan dirilis sendiri.

## Milestone 1 — Antarmuka produk lengkap (selesai)
Semua layar bisa diklik dan berfungsi penuh di browser, memakai data contoh di `src/lib/fixtures.ts` dan penyimpanan stub di `src/lib/exam-store.ts` (localStorage, sinkron antar-tab).
- Login tunggal (username + sandi, peran dikenali otomatis) dengan pratinjau sandi.
- Halaman persiapan siswa: cek kamera, cek suara, token ujian.
- Halaman pengerjaan: layar penuh terkunci, deteksi pindah tab / keluar layar penuh / muat ulang, alarm, blokir screenshot & pintasan, watermark username, kamera melayang, navigasi nomor ringkas di pojok kanan atas, ragu-ragu, lewati, muat ulang per soal, soal bergambar, timer yang tetap berjalan saat keluar dan berhenti saat dijeda, kumpulkan hanya di soal terakhir, konfirmasi 2 langkah untuk kumpul & keluar.
- Hasil & analisis setelah submit, ekspor CSV/Excel.
- Ruang Pengawas & Panel Admin: token 5 menit (ganti manual), jeda/gangguan server, pemantauan siswa & log pelanggaran, reset siswa, bank soal (tambah/ubah/gambar), import .xlsx/.csv/.docx/.txt, pengaturan ujian.

## Milestone 2 — Database & migrasi
- Netlify Database (Postgres) + Drizzle: `db/schema.ts` untuk `users`, `exams`, `exam_sections`, `questions`, `question_options`, `exam_tokens`, `attempts`, `attempt_answers`, `violations`, `results`.
- Migrasi dibuat dengan `drizzle-kit generate` dan diterapkan otomatis saat deploy; seed soal contoh.
- Ganti fungsi di `exam-store.ts` dengan pemanggilan server function — komponen UI tidak perlu berubah.

## Milestone 3 — Autentikasi server
- Login di server dengan sandi ter-hash, sesi via cookie HttpOnly, guard per peran.
- Kunci sesi di server saat pelanggaran (wajib login ulang + token baru), bukan hanya di browser.

## Milestone 4 — Logika ujian di server
- Token dibuat & dirotasi di server (scheduled function tiap 5 menit + tombol ganti manual); validasi "sekali pakai per siswa".
- Timer otoritatif di server (`ends_at`, akumulasi jeda), deteksi gangguan server otomatis menjeda timer.
- Autosave jawaban, penilaian di server — **kunci jawaban tidak lagi dikirim ke browser**.
- Pengacakan soal & opsi disimpan per attempt.

## Milestone 5 — Pengawasan realtime
- Heartbeat siswa & event pelanggaran ke server; dashboard pengawas update realtime.
- Snapshot kamera berkala disimpan di Netlify Blobs, galeri per siswa untuk pengawas.

## Milestone 6 — Konten & media
- Gambar soal disimpan di Netlify Blobs dan dilayani lewat Netlify Image CDN.
- Import .docx beserta gambar di dalamnya, import multi-sheet, pratinjau & edit sebelum simpan.
- Banyak ujian/jadwal, kelas, dan penugasan pengawas per ruang.

## Milestone 7 — Analisis lanjutan & ekspor
- Analisis butir soal (tingkat kesukaran, daya beda), statistik kelas, distribusi nilai.
- Ekspor .xlsx asli dari server, rekap per kelas/ruang.

## Milestone 8 — Pengerasan keamanan
- Hapus panel "Mode percobaan" (token terlihat) di halaman siswa.
- Header keamanan (CSP, frame-ancestors), rate limit login & token.
- Opsi pembungkus kiosk (mis. Safe Exam Browser / aplikasi desktop) untuk penguncian tingkat OS: browser biasa tidak bisa sepenuhnya mencegah screenshot dari perangkat lain atau mengatur volume sistem.
