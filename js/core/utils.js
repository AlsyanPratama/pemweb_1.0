/* ===== Util bersama (dipakai semua fitur) ===== */
export const $ = (s, r = document) => r.querySelector(s);

const HTML_ESCAPES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

export const rp = (n) => (n < 0 ? '- ' : '') + 'Rp ' + Math.abs(Math.round(n)).toLocaleString('id-ID');

export const pad = (n) => String(n).padStart(2, '0');

export const hariIni = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const tgl = (s) =>
    new Date(s + 'T00:00:00').toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

export const bt = (s) => [+s.slice(5, 7), +s.slice(0, 4)]; // 'YYYY-MM-DD' -> [bulan, tahun]

export const abstrak = () => {
    throw new Error('Method abstract harus di-override');
};

export const TipeTransaksi = Object.freeze({
    PEMASUKAN: 'PEMASUKAN',
    PENGELUARAN: 'PENGELUARAN',
});

export const JenisPengeluaran = Object.freeze({
    KEBUTUHAN: 'KEBUTUHAN',
    KEINGINAN: 'KEINGINAN',
});

export const LevelPeringatan = Object.freeze({
    AMAN: 'AMAN',
    HAMPIR_HABIS: 'HAMPIR HABIS',
    MELEBIHI_BATAS: 'MELEBIHI BATAS',
});
