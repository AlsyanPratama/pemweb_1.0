import { $, esc } from './utils.js';
import { buatContainer } from './container.js';

const KUNCI_USER = 'moneykos:user';
const KUNCI_FLASH = 'moneykos:flash';

const MENU = [
    ['dashboard', '📊', 'Dashboard', 'dashboard.html'],
    ['transaksi', '🧾', 'Transaksi', 'transaksi.html'],
    ['kategori', '🏷️', 'Kategori', 'kategori.html'],
    ['anggaran', '🐷', 'Anggaran Bulanan', 'anggaran.html'],
    ['laporan', '📄', 'Laporan', 'laporan.html'],
];

/** Tampilkan toast di #toast. err: true = merah, 'warn' = kuning. */
export function toast(pesan, err) {
    const kelas = err === 'warn' ? 'warn' : err ? 'err' : '';
    $('#toast').innerHTML = `<div class="toast ${kelas}">${esc(pesan)}<span onclick="this.parentNode.remove()">✕</span></div>`;
}

/** Simpan toast untuk ditampilkan setelah pindah/reload halaman. */
export function flash(pesan, err) {
    sessionStorage.setItem(KUNCI_FLASH, JSON.stringify({ pesan, err }));
}

function tampilkanFlash() {
    const raw = sessionStorage.getItem(KUNCI_FLASH);
    if (!raw) return;

    sessionStorage.removeItem(KUNCI_FLASH);
    const { pesan, err } = JSON.parse(raw);
    toast(pesan, err);
}

function sidebarHTML(halaman) {
    const menu = MENU.map(
        ([id, ikon, label, href]) =>
            `<a href="${href}" class="${id === halaman ? 'on' : ''}">${ikon} ${label}</a>`
    ).join('');

    return `
        <div class="brand"><div class="logo">💳</div><div><b>Money<span>Kos</span></b><small>Pengelola Keuangan Kos</small></div></div>
        <nav id="nav">${menu}</nav>
        <div class="side-bottom">
            <div class="card user"><div class="row"><span>Status Pengguna</span><b id="userName" class="ok"></b></div><small class="muted">Data Anda aman tersimpan secara privat.</small></div>
            <button id="logout" class="btn danger-soft">⎋ Keluar (Logout)</button>
        </div>`;
}

/**
 * Dipanggil sekali di tiap halaman (kecuali login).
 * - Jika belum login → arahkan ke login.html
 * - Menyisipkan sidebar ke <aside id="sidebar">
 * - Mengisi tanggal, nama user, tombol logout & reset
 * Mengembalikan { nama, prefix, svc } atau null jika belum login.
 */
export function initLayout(halaman) {
    const nama = localStorage.getItem(KUNCI_USER);
    if (!nama) {
        location.replace('login.html');
        return null;
    }

    const prefix = `moneykos:${nama}:`;
    const ctx = { nama, prefix, svc: buatContainer(prefix) };

    $('#sidebar').innerHTML = sidebarHTML(halaman);
    $('#userName').textContent = '● ' + nama;

    $('#tanggal').textContent = new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    $('#logout').onclick = () => {
        localStorage.removeItem(KUNCI_USER);
        location.href = 'login.html';
    };

    $('#reset').onclick = () => {
        if (!confirm('Hapus semua data akun ini?')) return;

        Object.keys(localStorage)
            .filter((k) => k.startsWith(prefix))
            .forEach((k) => localStorage.removeItem(k));

        flash('Data direset');
        location.href = location.pathname; // muat ulang tanpa ?edit=...
    };

    tampilkanFlash();
    return ctx;
}
