import { beforeEach, describe, expect, it } from 'vitest'
import {
  addUser,
  confirmIdentity,
  deleteUser,
  getAuth,
  getUsers,
  login,
  logout,
  updateUser,
} from './exam-store'

beforeEach(() => {
  localStorage.clear()
})

describe('login ketat', () => {
  it('berhasil bila sama persis', () => {
    expect(login('siswa01', 'siswa123')?.role).toBe('siswa')
  })
  it('menolak spasi di username atau sandi', () => {
    expect(login('siswa01 ', 'siswa123')).toBeNull()
    expect(login(' siswa01', 'siswa123')).toBeNull()
    expect(login('siswa01', 'siswa123 ')).toBeNull()
    expect(login('sis wa01', 'siswa123')).toBeNull()
  })
  it('username harus sama persis, termasuk huruf besar', () => {
    expect(login('Siswa01', 'siswa123')).toBeNull()
  })
  it('siswa belum terverifikasi, staf langsung terverifikasi', () => {
    expect(login('siswa01', 'siswa123')?.verified).toBe(false)
    logout()
    expect(login('admin', 'admin123')?.verified).toBe(true)
  })
})

describe('konfirmasi nama siswa', () => {
  it('menerima huruf besar/kecil campuran', () => {
    login('siswa01', 'siswa123') // Rina Maharani
    expect(confirmIdentity('RINA MAHARANI')).toBe(true)
    expect(getAuth()?.verified).toBe(true)
  })
  it('menolak nama berbeda atau spasi berlebih', () => {
    login('siswa01', 'siswa123')
    expect(confirmIdentity('Rina')).toBe(false)
    expect(confirmIdentity('Rina Maharani ')).toBe(false)
    expect(confirmIdentity('rina  maharani')).toBe(false)
    expect(getAuth()?.verified).toBe(false)
  })
  it('selalu diminta lagi setelah login ulang', () => {
    login('siswa01', 'siswa123')
    confirmIdentity('rina maharani')
    logout()
    expect(login('siswa01', 'siswa123')?.verified).toBe(false)
  })
})

describe('kelola akun oleh admin', () => {
  it('menambah akun baru yang bisa login', () => {
    expect(addUser({ username: 'rizky01', password: '12345a', role: 'siswa', name: ' rizky  aditya ', kelas: 'X A' }).ok).toBe(true)
    expect(getUsers().find((u) => u.username === 'rizky01')?.name).toBe('rizky aditya')
    expect(login('rizky01', '12345a')?.role).toBe('siswa')
  })
  it('menolak username/sandi tidak valid dan duplikat', () => {
    expect(addUser({ username: 'a b', password: '12345a', role: 'siswa', name: 'X' }).ok).toBe(false)
    expect(addUser({ username: 'abc', password: '12 345', role: 'siswa', name: 'X' }).ok).toBe(false)
    expect(addUser({ username: 'abc', password: '123', role: 'siswa', name: 'X' }).ok).toBe(false)
    expect(addUser({ username: 'SISWA01', password: '123456', role: 'siswa', name: 'X' }).ok).toBe(false)
  })
  it('tidak bisa membuat admin lewat panel', () => {
    expect(addUser({ username: 'adm2', password: '123456', role: 'admin' as never, name: 'X' }).ok).toBe(false)
  })
  it('mengubah nama dan sandi, username tetap', () => {
    expect(updateUser('siswa02', { name: 'Bagas Baru', kelas: 'XI', password: 'baru123' }).ok).toBe(true)
    expect(login('siswa02', 'siswa123')).toBeNull()
    expect(login('siswa02', 'baru123')?.name).toBe('Bagas Baru')
  })
  it('menghapus akun siswa/pengawas tetapi tidak admin', () => {
    expect(deleteUser('siswa03').ok).toBe(true)
    expect(getUsers().some((u) => u.username === 'siswa03')).toBe(false)
    expect(deleteUser('admin').ok).toBe(false)
    expect(updateUser('admin', { name: 'X' }).ok).toBe(false)
  })
})
