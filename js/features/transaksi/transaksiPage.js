import { $, esc, hariIni, LevelPeringatan } from '../../core/utils.js';
import { initLayout, toast, flash } from '../../core/layout.js';
import { banner } from '../dashboard/banner.js';
import { tabelTx } from './transaksiTabel.js';

const ctx = initLayout('transaksi');

// State halaman: mode ubah diambil dari URL (?edit=ID), filter disimpan di memori halaman.
const editId = +new URLSearchParams(location.search).get('edit') || null;
let filter = {};

if (ctx) {
    const edit = editId ? ctx.svc.tRepo.cariById(editId) : null;
    if (editId && !edit) location.replace('transaksi.html');
    else {
        isiForm(edit);
        renderBanner();
        renderFilterKategori();
        renderTabel();
        pasangEvent(edit);
    }
}

function opsi(list, terpilih) {
    return list
        .map(
            (k) =>
                `<option value="${k.getId()}" ${k.getId() === terpilih ? 'selected' : ''}>${esc(k.getNama())}</option>`
        )
        .join('');
}

function renderBanner() {
    $('#banner').innerHTML = banner(ctx.svc.pSvc);
}

/** Mengisi form tambah/ubah sesuai mode (edit = entitas yang diubah, atau null untuk tambah). */
function isiForm(edit, tipeDipilih) {
    const f = $('#fTx');
    const tipe = edit ? edit.getTipe() : tipeDipilih || $('#txTipe').value || 'PENGELUARAN';
    const kategori = ctx.svc.kSvc.ambilKategoriByTipe(tipe);

    $('#judulForm').textContent = (edit ? 'Ubah' : 'Tambah') + ' Transaksi';
    $('#btnSimpan').textContent = edit ? 'Simpan Perubahan' : 'Tambah';
    $('#btnBatal').classList.toggle('hidden', !edit);

    $('#txTipe').value = tipe;
    $('#txTipe').disabled = !!edit;

    f.elements.tanggal.value = edit ? edit.getTanggal() : f.elements.tanggal.value || hariIni();
    f.elements.jumlah.value = edit ? edit.getJumlah() : '';
    f.elements.keterangan.value = edit ? edit.getKeterangan() : '';

    $('#txKategori').innerHTML =
        '<option value="">Pilih kategori</option>' + opsi(kategori, edit?.getKategori()?.getId());
    $('#infoKosong').classList.toggle('hidden', kategori.length > 0);
    $('#infoKosong').firstChild.textContent = `Belum ada kategori ${tipe.toLowerCase()}. `;

    // Kolom jenis hanya untuk pengeluaran
    const adaJenis = tipe === 'PENGELUARAN';
    $('#kolomJenis').classList.toggle('hidden', !adaJenis);
    f.elements.jenis.disabled = !adaJenis;
    f.elements.jenis.value = edit?.getJenis?.() ?? 'KEBUTUHAN';
}

function renderFilterKategori() {
    $('#filterKategori').innerHTML =
        '<option value="">Semua</option>' + opsi(ctx.svc.kSvc.ambilSemuaKategori(), +filter.kategoriId);
}

function renderTabel() {
    $('#tabel').innerHTML = tabelTx(ctx.svc.tSvc.tampilkanRiwayat(filter), true);
}

function pasangEvent(edit) {
    // Ganti tipe → muat ulang pilihan kategori & kolom jenis
    $('#txTipe').addEventListener('change', (e) => isiForm(null, e.target.value));

    $('#btnBatal').addEventListener('click', () => (location.href = 'transaksi.html'));

    // Simpan transaksi
    $('#fTx').addEventListener('submit', (e) => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(e.target));
        const { tSvc, pSvc } = ctx.svc;

        try {
            if (edit) tSvc.ubahTransaksi(editId, d);
            else tSvc.tambahTransaksi(d);
        } catch (err) {
            toast(err.message, true);
            return;
        }

        const peringatan = pSvc.cekPeringatan();
        const level = peringatan.getLevel();
        const pesan =
            level === LevelPeringatan.AMAN
                ? edit
                    ? 'Transaksi diubah'
                    : 'Transaksi ditambahkan'
                : peringatan.getPesan();
        const jenisToast =
            level === LevelPeringatan.MELEBIHI_BATAS
                ? true
                : level === LevelPeringatan.HAMPIR_HABIS
                  ? 'warn'
                  : false;

        if (edit) {
            flash(pesan, jenisToast);
            location.href = 'transaksi.html';
            return;
        }

        toast(pesan, jenisToast);
        isiForm(null);
        renderBanner();
        renderTabel();
    });

    // Filter riwayat
    $('#fFilter').addEventListener('submit', (e) => {
        e.preventDefault();
        filter = Object.fromEntries(new FormData(e.target));
        renderTabel();
    });

    // Aksi di tabel: ubah, hapus, ganti jenis
    $('#tabel').addEventListener('click', (e) => {
        const d = e.target.dataset;

        if (d.editTx) {
            location.href = `transaksi.html?edit=${d.editTx}`;
        } else if (d.delTx && confirm('Hapus transaksi ini?')) {
            ctx.svc.tSvc.hapusTransaksi(+d.delTx);
            renderBanner();
            renderTabel();
        }
    });

    $('#tabel').addEventListener('change', (e) => {
        const id = e.target.dataset.jenis;
        if (!id) return;

        try {
            ctx.svc.klasSvc.tentukanJenis(+id, e.target.value);
        } catch (err) {
            toast(err.message, true);
        }
        renderTabel();
    });
}
