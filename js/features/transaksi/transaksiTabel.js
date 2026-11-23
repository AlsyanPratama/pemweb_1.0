import { esc, rp, tgl } from '../../core/utils.js';
import { Pemasukan } from './Transaksi.js';

function badge(t) {
    if (t instanceof Pemasukan) return '<span class="badge b-in">Pemasukan</span>';
    if (t.getJenis() === 'KEBUTUHAN') return '<span class="badge b-need">Kebutuhan</span>';
    return '<span class="badge b-want">Keinginan</span>';
}

/** Tabel transaksi — dipakai di Dashboard (aksi=false) dan halaman Transaksi (aksi=true). */
export function tabelTx(list, aksi) {
    const pilihJenis = (t) => `
            <select data-jenis="${t.getId()}">
                <option value="KEBUTUHAN" ${t.getJenis() === 'KEBUTUHAN' ? 'selected' : ''}>Kebutuhan</option>
                <option value="KEINGINAN" ${t.getJenis() === 'KEINGINAN' ? 'selected' : ''}>Keinginan</option>
            </select>`;

    const rows = list
        .map((t) => {
            const masuk = t instanceof Pemasukan;
            return `
                <tr>
                    <td>${tgl(t.getTanggal())}</td>
                    <td>${esc(t.getKategori()?.getNama() ?? '-')}</td>
                    <td class="muted">${esc(t.getKeterangan())}</td>
                    <td>${aksi && !masuk ? pilihJenis(t) : badge(t)}</td>
                    <td class="n ${masuk ? 'plus' : 'minus'}">${masuk ? '+ ' : '- '}${rp(t.getJumlah())}</td>
                    ${
                        aksi
                            ? `<td class="n">
                                <button class="btn sm ghost" data-edit-tx="${t.getId()}">Ubah</button>
                                <button class="btn sm del" data-del-tx="${t.getId()}">Hapus</button>
                               </td>`
                            : ''
                    }
                </tr>`;
        })
        .join('');

    return `
        <table>
            <tr><th>Tanggal</th><th>Kategori</th><th>Keterangan</th><th>Jenis</th><th class="n">Nominal</th>${aksi ? '<th></th>' : ''}</tr>
            ${rows || '<tr><td colspan=6 class="empty">Belum ada transaksi</td></tr>'}
        </table>`;
}
