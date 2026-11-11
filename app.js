'use strict';

/* ===== Util ===== */
const $ = (s, r = document) => r.querySelector(s);

const HTML_ESCAPES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

const rp = (n) => (n < 0 ? '- ' : '') + 'Rp ' + Math.abs(Math.round(n)).toLocaleString('id-ID');

const pad = (n) => String(n).padStart(2, '0');

const hariIni = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const tgl = (s) =>
    new Date(s + 'T00:00:00').toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

const bt = (s) => [+s.slice(5, 7), +s.slice(0, 4)]; // 'YYYY-MM-DD' -> [bulan, tahun]

const abstrak = () => {
    throw new Error('Method abstract harus di-override');
};

const TipeTransaksi = Object.freeze({
    PEMASUKAN: 'PEMASUKAN',
    PENGELUARAN: 'PENGELUARAN',
});

const JenisPengeluaran = Object.freeze({
    KEBUTUHAN: 'KEBUTUHAN',
    KEINGINAN: 'KEINGINAN',
});

const LevelPeringatan = Object.freeze({
    AMAN: 'AMAN',
    HAMPIR_HABIS: 'HAMPIR HABIS',
    MELEBIHI_BATAS: 'MELEBIHI BATAS',
});

/* ===== ANGGOTA 2 (Archy): BaseEntity, IStorage, LocalStorageAdapter, IRepository, Kategori ===== */
class IStorage {
    baca(kunci) { abstrak(); }
    tulis(kunci, data) { abstrak(); }
    hapus(kunci) { abstrak(); }
}

class LocalStorageAdapter extends IStorage {
    #prefix;

    constructor(prefix) {
        super();
        this.#prefix = prefix;
    }

    baca(kunci) {
        return localStorage.getItem(this.#prefix + kunci);
    }

    tulis(kunci, data) {
        localStorage.setItem(this.#prefix + kunci, data);
    }

    hapus(kunci) {
        localStorage.removeItem(this.#prefix + kunci);
    }
}

class BaseEntity {
    _id = 0;
    _createdAt = new Date().toISOString();
    _updatedAt = this._createdAt;

    constructor() {
        if (new.target === BaseEntity) throw new Error('BaseEntity abstract');
    }

    getId() { return this._id; }
    setId(id) { this._id = id; }
    getCreatedAt() { return this._createdAt; }
    getUpdatedAt() { return this._updatedAt; }

    _perbaruiWaktu() {
        this._updatedAt = new Date().toISOString();
    }

    _base() {
        return { id: this._id, createdAt: this._createdAt, updatedAt: this._updatedAt };
    }

    _muat(o) {
        this._id = o.id;
        this._createdAt = o.createdAt;
        this._updatedAt = o.updatedAt;
        return this;
    }

    validate() { abstrak(); }
}

/** Kontrak CRUD (interface) + implementasi dasar berbasis IStorage; subclass hanya mengisi _fromJSON(). */
class IRepository {
    #storage;
    #kunci;

    constructor(storage, kunci) {
        if (new.target === IRepository) throw new Error('IRepository interface');
        this.#storage = storage;
        this.#kunci = kunci;
    }

    _fromJSON(o) { abstrak(); }

    #data() {
        return JSON.parse(this.#storage.baca(this.#kunci) || '{"next":1,"items":[]}');
    }

    #simpanData(data) {
        this.#storage.tulis(this.#kunci, JSON.stringify(data));
    }

    ambilSemua() {
        return this.#data().items.map((o) => this._fromJSON(o));
    }

    cariById(id) {
        const o = this.#data().items.find((x) => x.id === id);
        return o ? this._fromJSON(o) : null;
    }

    simpan(entitas) {
        if (!entitas.validate()) throw new Error('Data tidak valid');

        const data = this.#data();
        entitas.setId(data.next++);
        data.items.push(entitas.toJSON());
        this.#simpanData(data);
        return entitas;
    }

    perbarui(entitas) {
        const data = this.#data();
        const idx = data.items.findIndex((x) => x.id === entitas.getId());
        if (idx < 0) throw new Error('Data tidak ditemukan');

        entitas._perbaruiWaktu();
        data.items[idx] = entitas.toJSON();
        this.#simpanData(data);
        return entitas;
    }

    hapus(id) {
        const data = this.#data();
        data.items = data.items.filter((x) => x.id !== id);
        this.#simpanData(data);
    }
}

class Kategori extends BaseEntity {
    #nama;
    #tipe;
    #deskripsi;

    constructor(nama, tipe, deskripsi = '') {
        super();
        this.#nama = nama;
        this.#tipe = tipe;
        this.#deskripsi = deskripsi;
    }

    getNama() { return this.#nama; }
    setNama(nama) { this.#nama = nama; }
    getTipe() { return this.#tipe; }
    setTipe(tipe) { this.#tipe = tipe; }
    getDeskripsi() { return this.#deskripsi; }
    setDeskripsi(deskripsi) { this.#deskripsi = deskripsi; }

    validate() {
        return this.#nama.trim() !== '' && Object.values(TipeTransaksi).includes(this.#tipe);
    }

    toJSON() {
        return {
            ...this._base(),
            nama: this.#nama,
            tipe: this.#tipe,
            deskripsi: this.#deskripsi,
        };
    }
}

class KategoriRepository extends IRepository {
    constructor(storage) {
        super(storage, 'kategori');
    }

    _fromJSON(o) {
        return new Kategori(o.nama, o.tipe, o.deskripsi)._muat(o);
    }

    cariByNama(nama) {
        return (
            this.ambilSemua().find((k) => k.getNama().toLowerCase() === nama.toLowerCase()) || null
        );
    }
}

class KategoriService {
    constructor(kategoriRepo, transaksiRepo) {
        this.kategoriRepo = kategoriRepo;
        this.transaksiRepo = transaksiRepo;
    }

    #cekNama(nama, tipe, idLain = 0) {
        const namaBaru = nama.trim().toLowerCase();
        const duplikat = this.kategoriRepo
            .ambilSemua()
            .some(
                (k) =>
                    k.getId() !== idLain &&
                    k.getTipe() === tipe &&
                    k.getNama().toLowerCase() === namaBaru
            );

        if (duplikat) throw new Error('Nama kategori sudah ada pada tipe yang sama');
    }

    tambahKategori(nama, tipe, deskripsi) {
        this.#cekNama(nama, tipe);
        return this.kategoriRepo.simpan(new Kategori(nama.trim(), tipe, deskripsi));
    }

    ubahKategori(id, { nama, tipe, deskripsi }) {
        const kategori = this.kategoriRepo.cariById(id);
        if (!kategori) throw new Error('Kategori tidak ditemukan');

        this.#cekNama(nama, tipe, id);

        kategori.setNama(nama.trim());
        kategori.setTipe(tipe);
        kategori.setDeskripsi(deskripsi);
        if (!kategori.validate()) throw new Error('Data tidak valid');

        return this.kategoriRepo.perbarui(kategori);
    }

    hapusKategori(id) {
        const dipakai = this.transaksiRepo.ambilSemua().some((t) => t.getKategori()?.getId() === id);
        if (dipakai) throw new Error('Kategori masih dipakai transaksi, tidak bisa dihapus');

        this.kategoriRepo.hapus(id);
    }

    ambilSemuaKategori() {
        return this.kategoriRepo.ambilSemua();
    }

    ambilKategoriByTipe(tipe) {
        return this.ambilSemuaKategori().filter((k) => k.getTipe() === tipe);
    }
}

/* ===== ANGGOTA 1 (Daffa): Transaksi, Pemasukan, Pengeluaran, TransaksiRepository, TransaksiService, KlasifikasiService ===== */
class Transaksi extends BaseEntity {
    _jumlah;
    _tanggal;
    _keterangan;
    _kategori;

    constructor({ jumlah, tanggal, keterangan = '', kategori }) {
        super();
        if (new.target === Transaksi) throw new Error('Transaksi abstract');

        Object.assign(this, {
            _jumlah: +jumlah,
            _tanggal: tanggal,
            _keterangan: keterangan,
            _kategori: kategori,
        });
    }

    getJumlah() { return this._jumlah; }
    getTanggal() { return this._tanggal; }
    getKeterangan() { return this._keterangan; }
    getKategori() { return this._kategori; }

    getTipe() { abstrak(); }
    getNominalEfektif() { abstrak(); }

    validate() {
        return (
            this._jumlah > 0 &&
            !!this._tanggal &&
            !!this._kategori &&
            this._kategori.getTipe() === this.getTipe()
        );
    }

    toJSON() {
        return {
            ...this._base(),
            tipe: this.getTipe(),
            jumlah: this._jumlah,
            tanggal: this._tanggal,
            keterangan: this._keterangan,
            kategoriId: this._kategori?.getId(),
        };
    }
}

class Pemasukan extends Transaksi {
    getTipe() { return TipeTransaksi.PEMASUKAN; }
    getNominalEfektif() { return this._jumlah; }
}

class Pengeluaran extends Transaksi {
    _jenis = JenisPengeluaran.KEBUTUHAN;

    constructor(data) {
        super(data);
        this._jenis = data.jenis || JenisPengeluaran.KEBUTUHAN;
    }

    getJenis() { return this._jenis; }
    setJenis(jenis) { this._jenis = jenis; }

    getTipe() { return TipeTransaksi.PENGELUARAN; }
    getNominalEfektif() { return -this._jumlah; }

    validate() {
        return super.validate() && Object.values(JenisPengeluaran).includes(this._jenis);
    }

    toJSON() {
        return { ...super.toJSON(), jenis: this._jenis };
    }
}

class TransaksiRepository extends IRepository {
    constructor(storage, kategoriRepo) {
        super(storage, 'transaksi');
        this.kategoriRepo = kategoriRepo;
    }

    _fromJSON(o) {
        const data = {
            jumlah: o.jumlah,
            tanggal: o.tanggal,
            keterangan: o.keterangan,
            kategori: this.kategoriRepo.cariById(o.kategoriId),
            jenis: o.jenis,
        };
        const transaksi =
            o.tipe === TipeTransaksi.PEMASUKAN ? new Pemasukan(data) : new Pengeluaran(data);

        return transaksi._muat(o);
    }

    cariByPeriode(awal, akhir) {
        return this.ambilSemua().filter(
            (t) => (!awal || t.getTanggal() >= awal) && (!akhir || t.getTanggal() <= akhir)
        );
    }

    cariByKategori(kategoriId) {
        return this.ambilSemua().filter((t) => t.getKategori()?.getId() === kategoriId);
    }
}

class TransaksiService {
    constructor(transaksiRepo, kategoriRepo) {
        this.transaksiRepo = transaksiRepo;
        this.kategoriRepo = kategoriRepo;
    }

    #buat(data) {
        const kategori = this.kategoriRepo.cariById(+data.kategoriId);
        if (!kategori) throw new Error('Kategori wajib dipilih');

        const payload = { ...data, kategori };
        return kategori.getTipe() === TipeTransaksi.PEMASUKAN
            ? new Pemasukan(payload)
            : new Pengeluaran(payload);
    }

    tambahTransaksi(data) {
        return this.transaksiRepo.simpan(this.#buat(data));
    }

    ubahTransaksi(id, data) {
        const lama = this.transaksiRepo.cariById(id);
        if (!lama) throw new Error('Data tidak ditemukan');

        const baru = this.#buat(data);
        baru.setId(id);
        baru._createdAt = lama.getCreatedAt();
        return this.transaksiRepo.perbarui(baru);
    }

    hapusTransaksi(id) {
        this.transaksiRepo.hapus(id);
    }

    tampilkanRiwayat(filter = {}) {
        const { awal, akhir, kategoriId, tipe } = filter;

        return this.transaksiRepo
            .cariByPeriode(awal, akhir)
            .filter((t) => !kategoriId || t.getKategori()?.getId() === +kategoriId)
            .filter((t) => !tipe || t.getTipe() === tipe)
            .sort((a, b) => b.getTanggal().localeCompare(a.getTanggal()) || b.getId() - a.getId());
    }
}

class KlasifikasiService {
    constructor(transaksiRepo) {
        this.transaksiRepo = transaksiRepo;
    }

    tentukanJenis(id, jenis) {
        const pengeluaran = this.transaksiRepo.cariById(id);
        if (!(pengeluaran instanceof Pengeluaran)) {
            throw new Error('Hanya pengeluaran yang punya jenis');
        }

        pengeluaran.setJenis(jenis);
        this.transaksiRepo.perbarui(pengeluaran);
    }
}

/* ===== ANGGOTA 4 (Kayana): Anggaran, AnggaranRepository, AnggaranService, Laporan* ===== */
class Anggaran extends BaseEntity {
    #bulan;
    #tahun;
    #total;
    #batas;

    constructor(bulan, tahun, total, batas = 0) {
        super();
        this.#bulan = bulan;
        this.#tahun = tahun;
        this.#total = +total;
        this.#batas = +batas;
    }

    getBulan() { return this.#bulan; }
    getTahun() { return this.#tahun; }
    getTotalAnggaran() { return this.#total; }
    getBatasHarian() { return this.#batas; }
    setTotalAnggaran(n) { this.#total = +n; }
    setBatasHarian(n) { this.#batas = +n; }

    validate() {
        return this.#total > 0 && this.#batas >= 0 && this.#batas <= this.#total;
    }

    toJSON() {
        return {
            ...this._base(),
            bulan: this.#bulan,
            tahun: this.#tahun,
            total: this.#total,
            batas: this.#batas,
        };
    }
}

class AnggaranRepository extends IRepository {
    constructor(storage) {
        super(storage, 'anggaran');
    }

    _fromJSON(o) {
        return new Anggaran(o.bulan, o.tahun, o.total, o.batas)._muat(o);
    }

    cariByBulan(bulan, tahun) {
        return (
            this.ambilSemua().find((a) => a.getBulan() === bulan && a.getTahun() === tahun) || null
        );
    }
}

class AnggaranService {
    constructor(anggaranRepo) {
        this.anggaranRepo = anggaranRepo;
    }

    aturAnggaranBulanan(bulan, tahun, total) {
        const anggaran = this.anggaranRepo.cariByBulan(bulan, tahun);
        if (!anggaran) return this.anggaranRepo.simpan(new Anggaran(bulan, tahun, total));

        const batas = anggaran.getBatasHarian();
        anggaran.setTotalAnggaran(total);
        anggaran.setBatasHarian(Math.min(batas, +total));
        if (!anggaran.validate()) throw new Error('Total anggaran harus lebih dari 0');

        return this.anggaranRepo.perbarui(anggaran);
    }

    aturBatasHarian(bulan, tahun, batas) {
        const anggaran = this.anggaranRepo.cariByBulan(bulan, tahun);
        if (!anggaran) throw new Error('Tetapkan total anggaran bulan itu terlebih dahulu');

        anggaran.setBatasHarian(batas);
        if (!anggaran.validate()) throw new Error('Batas harian tidak boleh melebihi total anggaran');

        return this.anggaranRepo.perbarui(anggaran);
    }

    hapusAnggaran(id) {
        this.anggaranRepo.hapus(id);
    }

    ambilSemua() {
        return this.anggaranRepo
            .ambilSemua()
            .sort((a, b) => b.getTahun() - a.getTahun() || b.getBulan() - a.getBulan());
    }

    ambilAnggaran(bulan, tahun) {
        return this.anggaranRepo.cariByBulan(bulan, tahun);
    }
}

class Laporan {
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

class LaporanPeriode extends Laporan {
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

class LaporanKategori extends Laporan {
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

class LaporanService {
    constructor(transaksiRepo, kategoriRepo) {
        this.transaksiRepo = transaksiRepo;
        this.kategoriRepo = kategoriRepo;
    }

    terimaPermintaan(kriteria) {
        const { awal, akhir, kategoriId } = kriteria;
        if (awal && akhir && awal > akhir) {
            throw new Error('Periode awal tidak boleh lebih besar dari periode akhir');
        }

        const data = this.transaksiRepo.cariByPeriode(awal, akhir);
        let laporan;

        if (kategoriId) {
            const kategori = this.kategoriRepo.cariById(+kategoriId);
            if (!kategori) throw new Error('Kategori tidak ditemukan');
            laporan = new LaporanKategori(awal, akhir, data, kategori);
        } else {
            laporan = new LaporanPeriode(awal, akhir, data);
        }

        laporan.generate();
        return laporan;
    }
}

/* ===== ANGGOTA 3 (Alsyan): PemantauService, InfoSaldo, Peringatan, RingkasanService, RingkasanPengeluaran ===== */
class InfoSaldo {
    constructor(o) {
        Object.assign(this, o);
    }
}

class Peringatan {
    constructor(pesan, level) {
        this.pesan = pesan;
        this.level = level;
    }

    getPesan() { return this.pesan; }
    getLevel() { return this.level; }
}

class PemantauService {
    constructor(transaksiRepo, anggaranRepo) {
        this.transaksiRepo = transaksiRepo;
        this.anggaranRepo = anggaranRepo;
    }

    #keluar(filter) {
        return this.transaksiRepo
            .ambilSemua()
            .filter((t) => t instanceof Pengeluaran && filter(t))
            .reduce((s, t) => s + t.getJumlah(), 0);
    }

    #anggaranBulanIni() {
        const [bulan, tahun] = bt(hariIni());
        return this.anggaranRepo.cariByBulan(bulan, tahun);
    }

    hitungPengeluaranHariIni() {
        return this.#keluar((t) => t.getTanggal() === hariIni());
    }

    hitungSaldo() {
        return this.transaksiRepo.ambilSemua().reduce((s, t) => s + t.getNominalEfektif(), 0);
    }

    hitungSisaBatasHarian() {
        const anggaran = this.#anggaranBulanIni();
        return anggaran ? anggaran.getBatasHarian() - this.hitungPengeluaranHariIni() : 0;
    }

    hitungSisaAnggaranBulanan() {
        const anggaran = this.#anggaranBulanIni();
        const prefixBulan = hariIni().slice(0, 7);

        return anggaran
            ? anggaran.getTotalAnggaran() - this.#keluar((t) => t.getTanggal().startsWith(prefixBulan))
            : 0;
    }

    tampilkanInformasi() {
        const anggaran = this.#anggaranBulanIni();

        return new InfoSaldo({
            saldo: this.hitungSaldo(),
            pengeluaranHariIni: this.hitungPengeluaranHariIni(),
            sisaBatasHarian: this.hitungSisaBatasHarian(),
            sisaAnggaranBulanan: this.hitungSisaAnggaranBulanan(),
            batas: anggaran ? anggaran.getBatasHarian() : 0,
            total: anggaran ? anggaran.getTotalAnggaran() : 0,
        });
    }

    cekPeringatan() {
        const info = this.tampilkanInformasi();

        if (!info.total) {
            return new Peringatan(
                'Belum ada anggaran bulan ini. Atur di menu Anggaran Bulanan.',
                LevelPeringatan.AMAN
            );
        }
        if (info.sisaAnggaranBulanan < 0) {
            return new Peringatan('Anggaran bulanan sudah terlampaui!', LevelPeringatan.MELEBIHI_BATAS);
        }
        if (!info.batas) {
            return new Peringatan(
                'Batas harian belum diatur. Isi di menu Anggaran Bulanan agar peringatan harian aktif.',
                LevelPeringatan.AMAN
            );
        }

        const persen = (info.pengeluaranHariIni / info.batas) * 100;
        if (persen > 100) {
            return new Peringatan(
                `PERINGATAN! Pengeluaran hari ini melebihi batas harian (${Math.round(persen)}%).`,
                LevelPeringatan.MELEBIHI_BATAS
            );
        }
        if (persen >= 80) {
            return new Peringatan(
                `PERINGATAN! Pengeluaran hari ini sudah mencapai ${Math.round(persen)}% dari batas harian. Hemat ya!`,
                LevelPeringatan.HAMPIR_HABIS
            );
        }
        return new Peringatan('Pengeluaran hari ini masih aman. Pertahankan!', LevelPeringatan.AMAN);
    }
}

class RingkasanPengeluaran {
    constructor(totalKebutuhan, totalKeinginan) {
        this.totalKebutuhan = totalKebutuhan;
        this.totalKeinginan = totalKeinginan;
    }

    getTotalKebutuhan() { return this.totalKebutuhan; }
    getTotalKeinginan() { return this.totalKeinginan; }

    getPersentaseKeinginan() {
        const total = this.totalKebutuhan + this.totalKeinginan;
        return total ? (this.totalKeinginan / total) * 100 : 0;
    }
}

class RingkasanService {
    constructor(transaksiRepo) {
        this.transaksiRepo = transaksiRepo;
    }

    buatRingkasan(bulan, tahun) {
        const pengeluaran = this.transaksiRepo
            .ambilSemua()
            .filter((x) => x instanceof Pengeluaran && bt(x.getTanggal()).join() === [bulan, tahun].join());

        const jumlahPerJenis = (jenis) =>
            pengeluaran.filter((x) => x.getJenis() === jenis).reduce((s, x) => s + x.getJumlah(), 0);

        return new RingkasanPengeluaran(
            jumlahPerJenis(JenisPengeluaran.KEBUTUHAN),
            jumlahPerJenis(JenisPengeluaran.KEINGINAN)
        );
    }
}

/* ===== UI (Controller halaman) ===== */
const JUDUL_HALAMAN = {
    dashboard: ['Dashboard Utama', 'Pantau saldo, anggaran harian, dan peringatan keuangan kos kamu.'],
    transaksi: ['Transaksi', 'Catat dan kelola pemasukan serta pengeluaran.'],
    kategori: ['Kategori', 'Kelola kategori pemasukan dan pengeluaran.'],
    anggaran: ['Anggaran Bulanan', 'Atur anggaran bulanan dan batas pengeluaran harian.'],
    laporan: ['Laporan Keuangan', 'Lihat rekap per periode atau per kategori.'],
};

const KATEGORI_BAWAAN = [
    ['Makan', 'PENGELUARAN'],
    ['Bayar Kos', 'PENGELUARAN'],
    ['Transportasi', 'PENGELUARAN'],
    ['Nongkrong', 'PENGELUARAN'],
    ['Rokok', 'PENGELUARAN'],
    ['Kopi & Minum', 'PENGELUARAN'],
    ['Laundry', 'PENGELUARAN'],
    ['Pulsa & Internet', 'PENGELUARAN'],
    ['Listrik & Air', 'PENGELUARAN'],
    ['Belanja Kebutuhan', 'PENGELUARAN'],
    ['Kuliah & Tugas', 'PENGELUARAN'],
    ['Kesehatan', 'PENGELUARAN'],
    ['Hiburan', 'PENGELUARAN'],
    ['Lainnya', 'PENGELUARAN'],
    ['Uang Kiriman', 'PEMASUKAN'],
    ['Gaji / Part-time', 'PEMASUKAN'],
    ['Beasiswa', 'PEMASUKAN'],
    ['Lainnya', 'PEMASUKAN'],
];

class App {
    page = 'dashboard';
    edit = null;
    filter = {};
    lap = null;

    constructor() {
        document.addEventListener('click', (e) => this.klik(e));
        document.addEventListener('submit', (e) => this.kirim(e));
        document.addEventListener('change', (e) => this.ubah(e));

        $('#loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.masuk($('#namaUser').value.trim(), true);
        });

        $('#logout').onclick = () => {
            localStorage.removeItem('moneykos:user');
            location.reload();
        };

        $('#reset').onclick = () => {
            if (!confirm('Hapus semua data akun ini?')) return;

            Object.keys(localStorage)
                .filter((k) => k.startsWith(this.prefix))
                .forEach((k) => localStorage.removeItem(k));

            this.siapkan();
            this.toast('Data direset');
            this.render();
        };

        $('#nav').onclick = (e) => {
            const a = e.target.closest('a');
            if (!a) return;

            this.page = a.dataset.page;
            this.edit = null;
            this.render();
        };

        const user = localStorage.getItem('moneykos:user');
        if (user) this.masuk(user, false);
        else $('#login').classList.remove('hidden');
    }

    masuk(nama, baru) {
        if (!nama) return;

        localStorage.setItem('moneykos:user', nama);
        this.nama = nama;
        this.prefix = `moneykos:${nama}:`;

        $('#login').classList.add('hidden');
        $('#app').classList.remove('hidden');
        $('#userName').textContent = '● ' + nama;

        this.siapkan();
        if (baru) this.toast(`Selamat datang kembali, ${nama}!`);
        this.render();
    }

    siapkan() {
        const storage = new LocalStorageAdapter(this.prefix);

        this.kRepo = new KategoriRepository(storage);
        this.tRepo = new TransaksiRepository(storage, this.kRepo);
        this.aRepo = new AnggaranRepository(storage);

        this.kSvc = new KategoriService(this.kRepo, this.tRepo);
        this.tSvc = new TransaksiService(this.tRepo, this.kRepo);
        this.klasSvc = new KlasifikasiService(this.tRepo);
        this.aSvc = new AnggaranService(this.aRepo);
        this.pSvc = new PemantauService(this.tRepo, this.aRepo);
        this.rSvc = new RingkasanService(this.tRepo);
        this.lSvc = new LaporanService(this.tRepo, this.kRepo);

        if (!this.kRepo.ambilSemua().length || !localStorage.getItem(this.prefix + 'seed2')) {
            this.seedKategori();
            localStorage.setItem(this.prefix + 'seed2', '1');
        }
    }

    seedKategori() {
        KATEGORI_BAWAAN.forEach(([nama, tipe]) => {
            try {
                this.kSvc.tambahKategori(nama, tipe, '');
            } catch (e) { /* sudah ada */ }
        });
    }

    toast(pesan, err) {
        const kelas = err === 'warn' ? 'warn' : err ? 'err' : '';
        $('#toast').innerHTML = `<div class="toast ${kelas}">${esc(pesan)}<span onclick="this.parentNode.remove()">✕</span></div>`;
    }

    coba(fn) {
        try {
            fn();
            return true;
        } catch (e) {
            this.toast(e.message, true);
            return false;
        }
    }

    render() {
        document
            .querySelectorAll('#nav a')
            .forEach((a) => a.classList.toggle('on', a.dataset.page === this.page));

        $('#tanggal').textContent = new Date().toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });

        const [judul, subjudul] = JUDUL_HALAMAN[this.page];
        $('#title').textContent = judul;
        $('#subtitle').textContent = subjudul;
        $('#view').innerHTML = this['v_' + this.page]();
    }

    /* --- Dashboard (Alsyan) --- */
    v_dashboard() {
        const info = this.pSvc.tampilkanInformasi();
        const [bulan, tahun] = bt(hariIni());
        const ringkasan = this.rSvc.buatRingkasan(bulan, tahun);
        const total = ringkasan.getTotalKebutuhan() + ringkasan.getTotalKeinginan() || 1;
        const terakhir = this.tSvc.tampilkanRiwayat().slice(0, 5);

        const kartu = (judul, nilai, sub) => `
            <div class="card stat">
                <small>${judul}</small>
                <h3>${nilai}</h3>
                <span class="muted">${sub}</span>
            </div>`;

        return `${this.banner()}
        <div class="stats">
            ${kartu('Total Saldo', rp(info.saldo), 'Akumulasi Pemasukan - Pengeluaran')}
            ${kartu('Pengeluaran Hari Ini', rp(info.pengeluaranHariIni), 'Hari ini')}
            ${kartu('Sisa Batas Harian', rp(info.sisaBatasHarian), 'Batas: ' + rp(info.batas) + ' / hari')}
            ${kartu('Sisa Anggaran Bulan Ini', rp(info.sisaAnggaranBulanan), 'Target: ' + rp(info.total))}
        </div>
        <div class="two">
            <div class="card">
                <div class="row"><h3>Kebutuhan vs Keinginan</h3><span class="muted">Bulan Ini</span></div>
                <p class="muted">Fitur 6.0 membantu mengevaluasi seberapa boros kamu membelanjakan uang kiriman kos untuk keinginan non-esensial.</p>
                <div class="row ok"><b>● Kebutuhan</b><b>${rp(ringkasan.getTotalKebutuhan())}</b></div>
                <div class="bar"><i style="width:${(ringkasan.getTotalKebutuhan() / total) * 100}%;background:#4fb77f"></i></div>
                <div class="row" style="color:var(--red)"><b>● Keinginan</b><b>${rp(ringkasan.getTotalKeinginan())}</b></div>
                <div class="bar"><i style="width:${(ringkasan.getTotalKeinginan() / total) * 100}%;background:#e05468"></i></div>
                <div class="row">
                    <span class="muted">Persentase Keinginan:</span>
                    <span class="pill">${ringkasan.getPersentaseKeinginan().toFixed(1)}% dari Total Pengeluaran</span>
                </div>
            </div>
            <div class="card">
                <div class="row">
                    <h3>Transaksi Terakhir</h3>
                    <a class="ok" style="cursor:pointer;font-weight:600" data-go="transaksi">Lihat Semua →</a>
                </div>
                ${this.tabelTx(terakhir, false)}
            </div>
        </div>`;
    }

    banner() {
        const peringatan = this.pSvc.cekPeringatan();
        const kelas = { AMAN: 'AMAN', 'HAMPIR HABIS': 'HAMPIR', 'MELEBIHI BATAS': 'LEBIH' }[peringatan.getLevel()];
        const ikon = { AMAN: '✅', HAMPIR: '🔔', LEBIH: '⛔' }[kelas];

        return `
        <div class="alert ${kelas}">
            <span class="ic">${ikon}</span>
            <div><b>Status Peringatan: ${peringatan.getLevel()}</b><p>${esc(peringatan.getPesan())}</p></div>
        </div>`;
    }

    badge(t) {
        if (t instanceof Pemasukan) return '<span class="badge b-in">Pemasukan</span>';
        if (t.getJenis() === 'KEBUTUHAN') return '<span class="badge b-need">Kebutuhan</span>';
        return '<span class="badge b-want">Keinginan</span>';
    }

    tabelTx(list, aksi) {
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
                    <td>${aksi && !masuk ? pilihJenis(t) : this.badge(t)}</td>
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

    /* --- Transaksi (Daffa) --- */
    v_transaksi() {
        const e = this.edit ? this.tRepo.cariById(this.edit) : null;
        const tipe = e ? e.getTipe() : this.tipeForm || 'PENGELUARAN';
        const kats = this.kSvc.ambilKategoriByTipe(tipe);
        const f = this.filter;

        const opt = (list, terpilih) =>
            list
                .map(
                    (k) =>
                        `<option value="${k.getId()}" ${k.getId() === terpilih ? 'selected' : ''}>${esc(k.getNama())}</option>`
                )
                .join('');

        const pilihTipe = (nilai, label) =>
            `<option value="${nilai}" ${tipe === nilai ? 'selected' : ''}>${label}</option>`;

        const pilihJenis = (nilai, label) =>
            `<option value="${nilai}" ${e?.getJenis?.() === nilai ? 'selected' : ''}>${label}</option>`;

        const infoKosong = kats.length
            ? ''
            : `<small class="muted">Belum ada kategori ${tipe.toLowerCase()}. <a class="ok" style="cursor:pointer" data-go="kategori">Tambah di menu Kategori</a></small>`;

        const kolomJenis =
            tipe === 'PENGELUARAN'
                ? `<div><label>Jenis</label><select name="jenis">${pilihJenis('KEBUTUHAN', 'Kebutuhan')}${pilihJenis('KEINGINAN', 'Keinginan')}</select></div>`
                : '';

        return `${this.banner()}
        <div class="card">
            <h3>${e ? 'Ubah' : 'Tambah'} Transaksi</h3>
            <form class="f" id="fTx">
                <div>
                    <label>Tipe</label>
                    <select id="txTipe" ${e ? 'disabled' : ''}>
                        ${pilihTipe('PENGELUARAN', 'Pengeluaran')}
                        ${pilihTipe('PEMASUKAN', 'Pemasukan')}
                    </select>
                </div>
                <div><label>Tanggal</label><input type="date" name="tanggal" value="${e ? e.getTanggal() : hariIni()}" required></div>
                <div>
                    <label>Kategori</label>
                    <select name="kategoriId" required>
                        <option value="">Pilih kategori</option>
                        ${opt(kats, e?.getKategori()?.getId())}
                    </select>
                    ${infoKosong}
                </div>
                <div><label>Nominal (Rp)</label><input type="number" name="jumlah" min="1" value="${e ? e.getJumlah() : ''}" required></div>
                <div><label>Keterangan</label><input name="keterangan" value="${esc(e?.getKeterangan() ?? '')}"></div>
                ${kolomJenis}
                <div>
                    <button class="btn primary" type="submit">${e ? 'Simpan Perubahan' : 'Tambah'}</button>
                    ${e ? '<button class="btn ghost" type="button" data-batal>Batal</button>' : ''}
                </div>
            </form>
        </div>
        <div class="card">
            <h3>Riwayat Transaksi</h3>
            <form class="f" id="fFilter">
                <div><label>Dari</label><input type="date" name="awal" value="${f.awal || ''}"></div>
                <div><label>Sampai</label><input type="date" name="akhir" value="${f.akhir || ''}"></div>
                <div>
                    <label>Kategori</label>
                    <select name="kategoriId">
                        <option value="">Semua</option>
                        ${opt(this.kSvc.ambilSemuaKategori(), +f.kategoriId)}
                    </select>
                </div>
                <div><button class="btn ghost" type="submit">Terapkan Filter</button></div>
            </form>
            ${this.tabelTx(this.tSvc.tampilkanRiwayat(f), true)}
        </div>`;
    }

    /* --- Kategori (Archy) --- */
    v_kategori() {
        const e = this.edit ? this.kRepo.cariById(this.edit) : null;

        const pilihTipe = (nilai, label) =>
            `<option value="${nilai}" ${e?.getTipe() === nilai ? 'selected' : ''}>${label}</option>`;

        const rows = this.kSvc
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

        return `
        <div class="card">
            <div class="row">
                <h3>${e ? 'Ubah' : 'Tambah'} Kategori</h3>
                <button class="btn sm ghost" data-seed>Pulihkan kategori bawaan</button>
            </div>
            <form class="f" id="fKat">
                <div><label>Nama</label><input name="nama" value="${esc(e?.getNama() ?? '')}" required></div>
                <div>
                    <label>Tipe</label>
                    <select name="tipe">
                        ${pilihTipe('PENGELUARAN', 'Pengeluaran')}
                        ${pilihTipe('PEMASUKAN', 'Pemasukan')}
                    </select>
                </div>
                <div><label>Deskripsi</label><input name="deskripsi" value="${esc(e?.getDeskripsi() ?? '')}"></div>
                <div>
                    <button class="btn primary">${e ? 'Simpan Perubahan' : 'Tambah'}</button>
                    ${e ? '<button class="btn ghost" type="button" data-batal>Batal</button>' : ''}
                </div>
            </form>
        </div>
        <div class="card">
            <table>
                <tr><th>Nama</th><th>Tipe</th><th>Deskripsi</th><th></th></tr>
                ${rows}
            </table>
        </div>`;
    }

    /* --- Anggaran (Kayana) --- */
    v_anggaran() {
        const e = this.edit ? this.aRepo.cariById(this.edit) : null;
        const bulan = e ? `${e.getTahun()}-${pad(e.getBulan())}` : hariIni().slice(0, 7);

        const rows = this.aSvc
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

        return `
        <div class="card">
            <h3>${e ? 'Ubah' : 'Atur'} Anggaran</h3>
            <form class="f" id="fAng">
                <div><label>Bulan</label><input type="month" name="bulan" value="${bulan}" required></div>
                <div><label>Total Anggaran (Rp)</label><input type="number" name="total" min="1" value="${e ? e.getTotalAnggaran() : ''}" required></div>
                <div><label>Batas Harian (Rp)</label><input type="number" name="batas" min="0" value="${e ? e.getBatasHarian() : ''}"></div>
                <div>
                    <button class="btn primary">Simpan</button>
                    ${e ? '<button class="btn ghost" type="button" data-batal>Batal</button>' : ''}
                </div>
            </form>
        </div>
        <div class="card">
            <table>
                <tr><th>Bulan</th><th class="n">Total Anggaran</th><th class="n">Batas Harian</th><th></th></tr>
                ${rows || '<tr><td colspan=4 class="empty">Belum ada anggaran</td></tr>'}
            </table>
        </div>`;
    }

    /* --- Laporan (Kayana) --- */
    v_laporan() {
        const f = this.filter;
        const d = new Date();
        const awal = f.lawal || `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
        const akhir = f.lakhir || hariIni();

        const opsiKategori = this.kSvc
            .ambilSemuaKategori()
            .map(
                (k) =>
                    `<option value="${k.getId()}" ${+f.lkat === k.getId() ? 'selected' : ''}>${esc(k.getNama())}</option>`
            )
            .join('');

        return `
        <div class="card">
            <form class="f" id="fLap">
                <div><label>Dari</label><input type="date" name="awal" value="${awal}" required></div>
                <div><label>Sampai</label><input type="date" name="akhir" value="${akhir}" required></div>
                <div>
                    <label>Kategori</label>
                    <select name="kategoriId">
                        <option value="">Semua (per periode)</option>
                        ${opsiKategori}
                    </select>
                </div>
                <div><button class="btn primary">Tampilkan Laporan</button></div>
            </form>
        </div>
        ${this.lap ? this.lap.tampilkan() : ''}`;
    }

    /* --- Event --- */
    klik(e) {
        const d = e.target.dataset;

        if (d.go) {
            this.page = d.go;
            this.render();
        } else if ('batal' in d) {
            this.edit = null;
            this.render();
        } else if ('seed' in d) {
            this.seedKategori();
            this.toast('Kategori bawaan dipulihkan');
            this.render();
        } else if (d.editTx) {
            this.edit = +d.editTx;
            this.render();
        } else if (d.editKat) {
            this.edit = +d.editKat;
            this.render();
        } else if (d.editAng) {
            this.edit = +d.editAng;
            this.render();
        } else if (d.delTx && confirm('Hapus transaksi ini?')) {
            this.tSvc.hapusTransaksi(+d.delTx);
            this.render();
        } else if (d.delKat && confirm('Hapus kategori ini?')) {
            if (this.coba(() => this.kSvc.hapusKategori(+d.delKat))) this.render();
        } else if (d.delAng && confirm('Hapus anggaran ini?')) {
            this.aSvc.hapusAnggaran(+d.delAng);
            this.render();
        }
    }

    ubah(e) {
        const t = e.target;

        if (t.id === 'txTipe') {
            this.tipeForm = t.value;
            this.render();
        } else if (t.dataset.jenis) {
            this.coba(() => this.klasSvc.tentukanJenis(+t.dataset.jenis, t.value));
            this.render();
        }
    }

    kirim(e) {
        const f = e.target;
        if (f.id === 'loginForm') return;

        e.preventDefault();
        const d = Object.fromEntries(new FormData(f));

        if (f.id === 'fTx') {
            const berhasil = this.coba(() =>
                this.edit ? this.tSvc.ubahTransaksi(this.edit, d) : this.tSvc.tambahTransaksi(d)
            );
            if (!berhasil) return;

            const peringatan = this.pSvc.cekPeringatan();
            const level = peringatan.getLevel();
            const pesan =
                level === LevelPeringatan.AMAN
                    ? this.edit
                        ? 'Transaksi diubah'
                        : 'Transaksi ditambahkan'
                    : peringatan.getPesan();
            const jenisToast =
                level === LevelPeringatan.MELEBIHI_BATAS
                    ? true
                    : level === LevelPeringatan.HAMPIR_HABIS
                      ? 'warn'
                      : false;

            this.toast(pesan, jenisToast);
            this.edit = null;
            this.render();
        } else if (f.id === 'fFilter') {
            this.filter = { ...this.filter, ...d };
            this.render();
        } else if (f.id === 'fKat') {
            const berhasil = this.coba(() =>
                this.edit
                    ? this.kSvc.ubahKategori(this.edit, d)
                    : this.kSvc.tambahKategori(d.nama, d.tipe, d.deskripsi)
            );
            if (!berhasil) return;

            this.toast('Kategori disimpan');
            this.edit = null;
            this.render();
        } else if (f.id === 'fAng') {
            const [tahun, bulan] = d.bulan.split('-').map(Number);
            const berhasil = this.coba(() => {
                this.aSvc.aturAnggaranBulanan(bulan, tahun, d.total);
                if (d.batas !== '') this.aSvc.aturBatasHarian(bulan, tahun, d.batas);
            });
            if (!berhasil) return;

            this.toast('Anggaran disimpan');
            this.edit = null;
            this.render();
        } else if (f.id === 'fLap') {
            this.filter = { ...this.filter, lawal: d.awal, lakhir: d.akhir, lkat: d.kategoriId };
            this.coba(() => {
                this.lap = this.lSvc.terimaPermintaan(d);
            });
            this.render();
        }
    }
}

new App();