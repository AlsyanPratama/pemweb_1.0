import { abstrak, esc, rp, tgl } from '../../core/utils.js';
import { Pemasukan, Pengeluaran } from '../transaksi/Transaksi.js';

export class Laporan {
    _periodeAwal;
    _periodeAkhir;
    _dataTerfilter = [];
    _totalPemasukan = 0;
    _totalPengeluaran = 0;

    constructor(awal, akhir, data) {
        if (new.target === Laporan) throw new Error('Laporan abstract');

        Object.assign(this, { _periodeAwal: awal, _periodeAkhir: akhir, _dataTerfilter: data });
    }

    _hitungTotal() {
        this._totalPemasukan = this._dataTerfilter
            .filter((t) => t instanceof Pemasukan)
            .reduce((s, t) => s + t.getJumlah(), 0);
        this._totalPengeluaran = this._dataTerfilter
            .filter((t) => t instanceof Pengeluaran)
            .reduce((s, t) => s + t.getJumlah(), 0);
    }

    getSelisih() {
        return this._totalPemasukan - this._totalPengeluaran;
    }

    generate() { abstrak(); }
    tampilkan() { abstrak(); }

    _ringkas() {
        return `
            <div class="sum">
                <div class="card stat"><small>Total Pemasukan</small><h3 class="plus">${rp(this._totalPemasukan)}</h3></div>
                <div class="card stat"><small>Total Pengeluaran</small><h3>${rp(this._totalPengeluaran)}</h3></div>
                <div class="card stat"><small>Selisih</small><h3>${rp(this.getSelisih())}</h3></div>
            </div>`;
    }
}

export class LaporanPeriode extends Laporan {
    _rekapHarian = new Map();

    generate() {
        this._hitungTotal();
        this._rekapHarian = new Map();

        const urut = [...this._dataTerfilter].sort((a, b) =>
            a.getTanggal().localeCompare(b.getTanggal())
        );

        urut.forEach((t) => {
            const rekap = this._rekapHarian.get(t.getTanggal()) || { masuk: 0, keluar: 0 };
            if (t instanceof Pemasukan) rekap.masuk += t.getJumlah();
            else rekap.keluar += t.getJumlah();
            this._rekapHarian.set(t.getTanggal(), rekap);
        });
    }

    tampilkan() {
        const rows = [...this._rekapHarian]
            .map(
                ([tanggal, r]) => `
                <tr>
                    <td>${tgl(tanggal)}</td>
                    <td class="n plus">${rp(r.masuk)}</td>
                    <td class="n">${rp(r.keluar)}</td>
                    <td class="n">${rp(r.masuk - r.keluar)}</td>
                </tr>`
            )
            .join('');

        return (
            this._ringkas() +
            `
            <div class="card">
                <h3>Rekap Harian</h3>
                <table>
                    <tr><th>Tanggal</th><th class="n">Pemasukan</th><th class="n">Pengeluaran</th><th class="n">Selisih</th></tr>
                    ${rows || '<tr><td colspan=4 class="empty">Tidak ada transaksi pada periode ini</td></tr>'}
                </table>
            </div>`
        );
    }
}

export class LaporanKategori extends Laporan {
    _kategori;
    _persen = 0;
    _semua;

    constructor(awal, akhir, data, kategori) {
        super(awal, akhir, data.filter((t) => t.getKategori()?.getId() === kategori.getId()));
        this._kategori = kategori;
        this._semua = data;
    }

    generate() {
        this._hitungTotal();

        const totalSemua = this._semua
            .filter((t) => t instanceof Pengeluaran)
            .reduce((s, t) => s + t.getJumlah(), 0);

        this._persen = totalSemua ? (this._totalPengeluaran / totalSemua) * 100 : 0;
    }

    tampilkan() {
        const rows = this._dataTerfilter
            .map(
                (t) => `
                <tr>
                    <td>${tgl(t.getTanggal())}</td>
                    <td>${esc(t.getKeterangan())}</td>
                    <td class="n">${rp(t.getNominalEfektif())}</td>
                </tr>`
            )
            .join('');

        return (
            this._ringkas() +
            `
            <div class="card">
                <h3>${esc(this._kategori.getNama())} <span class="pill">${this._persen.toFixed(1)}% dari total pengeluaran</span></h3>
                <table>
                    <tr><th>Tanggal</th><th>Keterangan</th><th class="n">Nominal</th></tr>
                    ${rows || '<tr><td colspan=3 class="empty">Tidak ada transaksi</td></tr>'}
                </table>
            </div>`
        );
    }
}
