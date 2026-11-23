import { $ } from '../../core/utils.js';
import { flash } from '../../core/layout.js';

// Sudah login? langsung ke dashboard.
if (localStorage.getItem('moneykos:user')) location.replace('dashboard.html');

$('#loginForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const nama = $('#namaUser').value.trim();
    if (!nama) return;

    localStorage.setItem('moneykos:user', nama);
    flash(`Selamat datang kembali, ${nama}!`);
    location.href = 'dashboard.html';
});
