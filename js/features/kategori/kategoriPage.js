import { $, esc } from '../../core/utils.js';
import { initLayout, toast, flash } from '../../core/layout.js';
import { isiKategoriBawaan } from '../../core/container.js';

const ctx = initLayout('kategori');
const editId = +new URLSearchParams(location.search).get('edit') || null;

if (ctx) {
    const edit = editId ? ctx.svc.kRepo.cariById(editId) : null;
    if (editId && !edit) location.replace('kategori.html');
    else {
        isiForm(edit);
        renderDaftar();
        pasangEvent(edit);
    }
}

function isiForm(edit) {
    const f = $('#fKat');

    $('#judulForm').textContent = (edit ? 'Ubah' : 'Tambah') + ' Kategori';
    $('#btnSimpan').textContent = edit ? 'Simpan Perubahan' : 'Tambah';
    $('#btnBatal').classList.toggle('hidden', !edit);

    f.elements.nama.value = edit?.getNama() ?? '';
    f.elements.tipe.value = edit?.getTipe() ?? 'PENGELUARAN';
    f.elements.deskripsi.value = edit?.getDeskripsi() ?? '';
}

function renderDaftar() {
    $('#daftar').innerHTML = ctx.svc.kSvc
        .ambilSemuaKategori()
        .map((k) => {
            const masuk = k.getTipe() === 'PEMASUKAN';
            return `
                <tr>
                    <td>${esc(k.getNama())}</td>
                    <td><span class="badge ${masuk ? 'b-in' : 'b-want'}">${masuk ? 'Pemasukan' : 'Pengeluaran'}</span></td>
                    <td class="muted">${esc(k.getDeskripsi())}</td>
                    <td class="n">
                        <button class="btn sm ghost" data-edit-kat="${k.getId()}">Ubah</button>
                        <button class="btn sm del" data-del-kat="${k.getId()}">Hapus</button>
                    </td>
                </tr>`;
        })
        .join('');
}

function pasangEvent(edit) {
    $('#btnBatal').addEventListener('click', () => (location.href = 'kategori.html'));

    $('#btnSeed').addEventListener('click', () => {
        isiKategoriBawaan(ctx.svc.kSvc);
        toast('Kategori bawaan dipulihkan');
        renderDaftar();
    });

    $('#fKat').addEventListener('submit', (e) => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(e.target));
        const { kSvc } = ctx.svc;

        try {
            if (edit) kSvc.ubahKategori(editId, d);
            else kSvc.tambahKategori(d.nama, d.tipe, d.deskripsi);
        } catch (err) {
            toast(err.message, true);
            return;
        }

        if (edit) {
            flash('Kategori disimpan');
            location.href = 'kategori.html';
            return;
        }

        toast('Kategori disimpan');
        isiForm(null);
        renderDaftar();
    });

    $('#daftar').addEventListener('click', (e) => {
        const d = e.target.dataset;

        if (d.editKat) {
            location.href = `kategori.html?edit=${d.editKat}`;
        } else if (d.delKat && confirm('Hapus kategori ini?')) {
            try {
                ctx.svc.kSvc.hapusKategori(+d.delKat);
            } catch (err) {
                toast(err.message, true);
                return;
            }
            renderDaftar();
        }
    });
}
