/**
 * Data contoh (stub) untuk milestone 1.
 * Seluruh data akun, ujian, dan soal ada di file ini agar mudah diganti
 * dengan Netlify Database pada milestone berikutnya (lihat PLAN.md).
 */

export type Role = 'admin' | 'pengawas' | 'siswa'

export interface UserAccount {
  username: string
  password: string
  role: Role
  name: string
  kelas?: string
}

export interface OptionItem {
  key: string // kunci stabil (A–E saat dibuat), tidak berubah saat diacak
  text: string
}

export interface Question {
  id: string
  section: string
  text: string
  image?: string
  options: OptionItem[]
  answer: string // key opsi yang benar
}

export interface ExamInfo {
  id: string
  title: string
  subject: string
  durationMinutes: number
  tokenIntervalMinutes: number
  shuffleQuestions: boolean
  shuffleOptions: boolean
  sections: { name: string; description: string }[]
}

export const USERS: UserAccount[] = [
  { username: 'admin', password: 'admin123', role: 'admin', name: 'Dra. Sri Wahyuni' },
  { username: 'pengawas', password: 'awas123', role: 'pengawas', name: 'Budi Santoso, S.Pd.' },
  { username: 'siswa01', password: 'siswa123', role: 'siswa', name: 'Rina Maharani', kelas: 'XII IPA 1' },
  { username: 'siswa02', password: 'siswa123', role: 'siswa', name: 'Bagas Pratama', kelas: 'XII IPA 1' },
  { username: 'siswa03', password: 'siswa123', role: 'siswa', name: 'Nadia Putri', kelas: 'XII IPA 2' },
  { username: 'siswa04', password: 'siswa123', role: 'siswa', name: 'Dimas Aditya', kelas: 'XII IPA 2' },
]

export const EXAM: ExamInfo = {
  id: 'to-sumatif-2026',
  title: 'Try Out Sumatif Akhir Semester',
  subject: 'Matematika, Fisika, Bahasa Indonesia & Penalaran',
  durationMinutes: 30,
  tokenIntervalMinutes: 5,
  shuffleQuestions: true,
  shuffleOptions: true,
  sections: [
    { name: 'Matematika', description: 'Aljabar, geometri, dan statistika dasar' },
    { name: 'Fisika', description: 'Kinematika dan listrik dinamis' },
    { name: 'Bahasa Indonesia', description: 'Kebahasaan dan pemahaman bacaan' },
    { name: 'Penalaran', description: 'Logika dan pola bilangan' },
  ],
}

const o = (...texts: string[]): OptionItem[] =>
  texts.map((text, i) => ({ key: 'ABCDE'[i], text }))

export const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 'mtk-1',
    section: 'Matematika',
    text: 'Perhatikan segitiga siku-siku pada gambar. Panjang sisi miring c adalah …',
    image: '/img/soal/segitiga.svg',
    options: o('11 cm', '12 cm', '13 cm', '14 cm', '17 cm'),
    answer: 'C',
  },
  {
    id: 'mtk-2',
    section: 'Matematika',
    text: 'Nilai x yang memenuhi persamaan 3x − 7 = 2x + 5 adalah …',
    options: o('−12', '−2', '2', '12', '15'),
    answer: 'D',
  },
  {
    id: 'mtk-3',
    section: 'Matematika',
    text: 'Grafik menunjukkan penjualan buku selama empat bulan. Rata-rata penjualan per bulan adalah …',
    image: '/img/soal/grafik-penjualan.svg',
    options: o('40 eksemplar', '45 eksemplar', '47,5 eksemplar', '50 eksemplar', '52,5 eksemplar'),
    answer: 'C',
  },
  {
    id: 'mtk-4',
    section: 'Matematika',
    text: 'Jika f(x) = 2x² − 3x + 1, maka nilai f(3) adalah …',
    options: o('8', '10', '12', '19', '28'),
    answer: 'B',
  },
  {
    id: 'fis-1',
    section: 'Fisika',
    text: 'Grafik kecepatan terhadap waktu sebuah mobil ditunjukkan di bawah. Jarak total yang ditempuh mobil selama 7 detik adalah …',
    image: '/img/soal/grafik-gerak.svg',
    options: o('45 m', '50 m', '55 m', '60 m', '70 m'),
    answer: 'C',
  },
  {
    id: 'fis-2',
    section: 'Fisika',
    text: 'Dua hambatan dirangkai seri dengan sumber tegangan seperti gambar. Kuat arus yang mengalir pada rangkaian adalah …',
    image: '/img/soal/rangkaian.svg',
    options: o('0,5 A', '1 A', '1,5 A', '2 A', '3 A'),
    answer: 'B',
  },
  {
    id: 'fis-3',
    section: 'Fisika',
    text: 'Sebuah benda bermassa 2 kg didorong dengan gaya 10 N di atas lantai licin. Percepatan benda adalah …',
    options: o('2 m/s²', '5 m/s²', '8 m/s²', '12 m/s²', '20 m/s²'),
    answer: 'B',
  },
  {
    id: 'fis-4',
    section: 'Fisika',
    text: 'Satuan daya listrik dalam Sistem Internasional adalah …',
    options: o('Joule', 'Volt', 'Ampere', 'Watt', 'Ohm'),
    answer: 'D',
  },
  {
    id: 'bin-1',
    section: 'Bahasa Indonesia',
    text: 'Penulisan kata yang sesuai dengan kaidah ejaan baku terdapat pada …',
    options: o('Analisa', 'Praktek', 'Kualitas', 'Resiko', 'Nasehat'),
    answer: 'C',
  },
  {
    id: 'bin-2',
    section: 'Bahasa Indonesia',
    text: '“Hutan mangrove berfungsi menahan abrasi pantai dan menjadi tempat berkembang biak berbagai jenis ikan.” Gagasan utama kalimat tersebut adalah …',
    options: o(
      'Abrasi pantai semakin parah',
      'Fungsi hutan mangrove',
      'Jenis-jenis ikan di pantai',
      'Cara menanam mangrove',
      'Kerusakan hutan di pesisir',
    ),
    answer: 'B',
  },
  {
    id: 'bin-3',
    section: 'Bahasa Indonesia',
    text: 'Kalimat berikut yang menggunakan kata penghubung pertentangan adalah …',
    options: o(
      'Ia belajar sehingga lulus.',
      'Ayah membaca koran dan minum teh.',
      'Rumahnya jauh, tetapi ia tidak pernah terlambat.',
      'Kami pergi setelah hujan reda.',
      'Adik menangis karena lapar.',
    ),
    answer: 'C',
  },
  {
    id: 'nal-1',
    section: 'Penalaran',
    text: 'Lanjutkan pola bilangan berikut: 2, 6, 12, 20, 30, …',
    options: o('38', '40', '42', '44', '48'),
    answer: 'C',
  },
  {
    id: 'nal-2',
    section: 'Penalaran',
    text: 'Semua siswa kelas XII mengikuti ujian. Sebagian siswa yang mengikuti ujian mendapat nilai A. Kesimpulan yang tepat adalah …',
    options: o(
      'Semua siswa kelas XII mendapat nilai A.',
      'Sebagian siswa kelas XII mungkin mendapat nilai A.',
      'Tidak ada siswa kelas XII yang mendapat nilai A.',
      'Semua yang mendapat nilai A bukan siswa kelas XII.',
      'Siswa kelas XII tidak mengikuti ujian.',
    ),
    answer: 'B',
  },
  {
    id: 'nal-3',
    section: 'Penalaran',
    text: 'Jika hari ini Rabu, maka 100 hari lagi adalah hari …',
    options: o('Kamis', 'Jumat', 'Sabtu', 'Minggu', 'Senin'),
    answer: 'B',
  },
  {
    id: 'nal-4',
    section: 'Penalaran',
    text: 'Sebuah kode: BUKU ditulis CVLV. Dengan aturan yang sama, MEJA ditulis …',
    options: o('NFKB', 'NEKB', 'LDIZ', 'NFJB', 'OGLC'),
    answer: 'A',
  },
]
