import { $, rp, pad, hariIni } from '../../core/utils.js';
import { initLayout, toast, flash } from '../../core/layout.js';

const ctx = initLayout('anggaran');
const editId = +new URLSearchParams(location.search).get('edit') || null;

if (ctx) {
    const edit = editId ? ctx.svc.aRepo.cariById(editId) : null;
    if (editId && !edit) location.replace('anggaran.html');
    else {
        isiForm(edit);
        renderDaftar();
        pasangEvent(edit);
    }
}

function isiForm(edit) {
    const f = $('#fAng');

    $('#judulForm').textContent = (edit ? 'Ubah' : 'Atur') + ' Anggaran';
    $('#btnBatal').classList.toggle('hidden', !edit);

    f.elements.bulan.value = edit ? `${edit.getTahun()}-${pad(edit.getBulan())}` : f.elements.bulan.value || hariIni().slice(0, 7);
    f.elements.total.value = edit ? edit.getTotalAnggaran() : '';
    f.elements.batas.value = edit ? edit.getBatasHarian() : '';
}

function renderDaftar() {
    const baris = ctx.svc.aSvc
        .ambilSemua()
        .map(
            (a) => `
                <tr>
                    <td>${pad(a.getBulan())}/${a.getTahun()}</td>
                    <td class="n">${rp(a.getTotalAnggaran())}</td>
                    <td class="n">${rp(a.getBatasHarian())}</td>
                    <td class="n">
                        <button class="btn sm ghost" data-edit-ang="${a.getId()}">Ubah</button>
                        <button class="btn sm del" data-del-ang="${a.getId()}">Hapus</button>
                    </td>
                </tr>`
        )
        .join('');

    $('#daftar').innerHTML = baris || '<tr><td colspan=4 class="empty">Belum ada anggaran</td></tr>';
}

function pasangEvent(edit) {
    $('#btnBatal').addEventListener('click', () => (location.href = 'anggaran.html'));

    $('#fAng').addEventListener('submit', (e) => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(e.target));
        const [tahun, bulan] = d.bulan.split('-').map(Number);
        const { aSvc } = ctx.svc;

        try {
            aSvc.aturAnggaranBulanan(bulan, tahun, d.total);
            if (d.batas !== '') aSvc.aturBatasHarian(bulan, tahun, d.batas);
        } catch (err) {
            toast(err.message, true);
            return;
        }

        if (edit) {
            flash('Anggaran disimpan');
            location.href = 'anggaran.html';
            return;
        }

        toast('Anggaran disimpan');
        isiForm(null);
        renderDaftar();
    });

    $('#daftar').addEventListener('click', (e) => {
        const d = e.target.dataset;

        if (d.editAng) {
            location.href = `anggaran.html?edit=${d.editAng}`;
        } else if (d.delAng && confirm('Hapus anggaran ini?')) {
            ctx.svc.aSvc.hapusAnggaran(+d.delAng);
            renderDaftar();
        }
    });
}
