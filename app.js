'use strict';
/* ===== Util ===== */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rp = n => (n < 0 ? '- ' : '') + 'Rp ' + Math.abs(Math.round(n)).toLocaleString('id-ID');
const pad = n => String(n).padStart(2, '0');
const hariIni = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const tgl = s => new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const bt = s => [+s.slice(5, 7), +s.slice(0, 4)]; // 'YYYY-MM-DD' -> [bulan, tahun]
const abstrak = () => { throw new Error('Method abstract harus di-override'); };
const TipeTransaksi = Object.freeze({ PEMASUKAN: 'PEMASUKAN', PENGELUARAN: 'PENGELUARAN' });
const JenisPengeluaran = Object.freeze({ KEBUTUHAN: 'KEBUTUHAN', KEINGINAN: 'KEINGINAN' });
const LevelPeringatan = Object.freeze({ AMAN: 'AMAN', HAMPIR_HABIS: 'HAMPIR HABIS', MELEBIHI_BATAS: 'MELEBIHI BATAS' });

/* ===== ANGGOTA 2 (Archy): BaseEntity, IStorage, LocalStorageAdapter, IRepository, Kategori ===== */
class IStorage { baca(k) { abstrak(); } tulis(k, d) { abstrak(); } hapus(k) { abstrak(); } }
class LocalStorageAdapter extends IStorage {
    #prefix; constructor(prefix) { super(); this.#prefix = prefix; }
    baca(k) { return localStorage.getItem(this.#prefix + k); }
    tulis(k, d) { localStorage.setItem(this.#prefix + k, d); }
    hapus(k) { localStorage.removeItem(this.#prefix + k); }
}
class BaseEntity {
    _id = 0; _createdAt = new Date().toISOString(); _updatedAt = this._createdAt;
    constructor() { if (new.target === BaseEntity) throw new Error('BaseEntity abstract'); }
    getId() { return this._id; } setId(i) { this._id = i; }
    getCreatedAt() { return this._createdAt; } getUpdatedAt() { return this._updatedAt; }
    _perbaruiWaktu() { this._updatedAt = new Date().toISOString(); }
    _base() { return { id: this._id, createdAt: this._createdAt, updatedAt: this._updatedAt }; }
    _muat(o) { this._id = o.id; this._createdAt = o.createdAt; this._updatedAt = o.updatedAt; return this; }
    validate() { abstrak(); }
}
/** Kontrak CRUD (interface) + implementasi dasar berbasis IStorage; subclass hanya mengisi _fromJSON(). */
class IRepository {
    #storage; #kunci;
    constructor(storage, kunci) { if (new.target === IRepository) throw new Error('IRepository interface'); this.#storage = storage; this.#kunci = kunci; }
    _fromJSON(o) { abstrak(); }
    #data() { return JSON.parse(this.#storage.baca(this.#kunci) || '{"next":1,"items":[]}'); }
    #simpanData(d) { this.#storage.tulis(this.#kunci, JSON.stringify(d)); }
    ambilSemua() { return this.#data().items.map(o => this._fromJSON(o)); }
    cariById(id) { const o = this.#data().items.find(x => x.id === id); return o ? this._fromJSON(o) : null; }
    simpan(e) { if (!e.validate()) throw new Error('Data tidak valid'); const d = this.#data(); e.setId(d.next++); d.items.push(e.toJSON()); this.#simpanData(d); return e; }
    perbarui(e) { const d = this.#data(), i = d.items.findIndex(x => x.id === e.getId()); if (i < 0) throw new Error('Data tidak ditemukan'); e._perbaruiWaktu(); d.items[i] = e.toJSON(); this.#simpanData(d); return e; }
    hapus(id) { const d = this.#data(); d.items = d.items.filter(x => x.id !== id); this.#simpanData(d); }
}
class Kategori extends BaseEntity {
    #nama; #tipe; #deskripsi;
    constructor(nama, tipe, deskripsi = '') { super(); this.#nama = nama; this.#tipe = tipe; this.#deskripsi = deskripsi; }
    getNama() { return this.#nama; } setNama(n) { this.#nama = n; } getTipe() { return this.#tipe; } setTipe(t) { this.#tipe = t; }
    getDeskripsi() { return this.#deskripsi; } setDeskripsi(d) { this.#deskripsi = d; }
    validate() { return this.#nama.trim() !== '' && Object.values(TipeTransaksi).includes(this.#tipe); }
    toJSON() { return { ...this._base(), nama: this.#nama, tipe: this.#tipe, deskripsi: this.#deskripsi }; }
}
class KategoriRepository extends IRepository {
    constructor(s) { super(s, 'kategori'); }
    _fromJSON(o) { return new Kategori(o.nama, o.tipe, o.deskripsi)._muat(o); }
    cariByNama(nama) { return this.ambilSemua().find(k => k.getNama().toLowerCase() === nama.toLowerCase()) || null; }
}
class KategoriService {
    constructor(kRepo, tRepo) { this.kategoriRepo = kRepo; this.transaksiRepo = tRepo; }
    #cekNama(nama, tipe, idLain = 0) { if (this.kategoriRepo.ambilSemua().some(k => k.getId() !== idLain && k.getTipe() === tipe && k.getNama().toLowerCase() === nama.trim().toLowerCase())) throw new Error('Nama kategori sudah ada pada tipe yang sama'); }
    tambahKategori(nama, tipe, deskripsi) { this.#cekNama(nama, tipe); return this.kategoriRepo.simpan(new Kategori(nama.trim(), tipe, deskripsi)); }
    ubahKategori(id, d) { const k = this.kategoriRepo.cariById(id); this.#cekNama(d.nama, d.tipe, id); k.setNama(d.nama.trim()); k.setTipe(d.tipe); k.setDeskripsi(d.deskripsi); if (!k.validate()) throw new Error('Data tidak valid'); return this.kategoriRepo.perbarui(k); }
    hapusKategori(id) { if (this.transaksiRepo.ambilSemua().some(t => t.getKategori()?.getId() === id)) throw new Error('Kategori masih dipakai transaksi, tidak bisa dihapus'); this.kategoriRepo.hapus(id); }
    ambilSemuaKategori() { return this.kategoriRepo.ambilSemua(); }
    ambilKategoriByTipe(tipe) { return this.ambilSemuaKategori().filter(k => k.getTipe() === tipe); }
}

/* ===== ANGGOTA 1 (Daffa): Transaksi, Pemasukan, Pengeluaran, TransaksiRepository, TransaksiService, KlasifikasiService ===== */
class Transaksi extends BaseEntity {
    _jumlah; _tanggal; _keterangan; _kategori;
    constructor({ jumlah, tanggal, keterangan = '', kategori }) { super(); if (new.target === Transaksi) throw new Error('Transaksi abstract'); Object.assign(this, { _jumlah: +jumlah, _tanggal: tanggal, _keterangan: keterangan, _kategori: kategori }); }
    getJumlah() { return this._jumlah; } getTanggal() { return this._tanggal; } getKeterangan() { return this._keterangan; } getKategori() { return this._kategori; }
    getTipe() { abstrak(); } getNominalEfektif() { abstrak(); }
    validate() { return this._jumlah > 0 && !!this._tanggal && !!this._kategori && this._kategori.getTipe() === this.getTipe(); }
    toJSON() { return { ...this._base(), tipe: this.getTipe(), jumlah: this._jumlah, tanggal: this._tanggal, keterangan: this._keterangan, kategoriId: this._kategori?.getId() }; }
}
class Pemasukan extends Transaksi {
    getTipe() { return TipeTransaksi.PEMASUKAN; } getNominalEfektif() { return this._jumlah; }
}
class Pengeluaran extends Transaksi {
    _jenis = JenisPengeluaran.KEBUTUHAN;
    constructor(d) { super(d); this._jenis = d.jenis || JenisPengeluaran.KEBUTUHAN; }
    getJenis() { return this._jenis; } setJenis(j) { this._jenis = j; }
    getTipe() { return TipeTransaksi.PENGELUARAN; } getNominalEfektif() { return -this._jumlah; }
    validate() { return super.validate() && Object.values(JenisPengeluaran).includes(this._jenis); }
    toJSON() { return { ...super.toJSON(), jenis: this._jenis }; }
}
class TransaksiRepository extends IRepository {
    constructor(s, kRepo) { super(s, 'transaksi'); this.kategoriRepo = kRepo; }
    _fromJSON(o) {
        const d = { jumlah: o.jumlah, tanggal: o.tanggal, keterangan: o.keterangan, kategori: this.kategoriRepo.cariById(o.kategoriId), jenis: o.jenis };
        return (o.tipe === TipeTransaksi.PEMASUKAN ? new Pemasukan(d) : new Pengeluaran(d))._muat(o);
    }
    cariByPeriode(awal, akhir) { return this.ambilSemua().filter(t => (!awal || t.getTanggal() >= awal) && (!akhir || t.getTanggal() <= akhir)); }
    cariByKategori(id) { return this.ambilSemua().filter(t => t.getKategori()?.getId() === id); }
}
class TransaksiService {
    constructor(tRepo, kRepo) { this.transaksiRepo = tRepo; this.kategoriRepo = kRepo; }
    #buat(d) {
        const kat = this.kategoriRepo.cariById(+d.kategoriId); if (!kat) throw new Error('Kategori wajib dipilih'); const x = { ...d, kategori: kat };
        return kat.getTipe() === TipeTransaksi.PEMASUKAN ? new Pemasukan(x) : new Pengeluaran(x);
    }
    tambahTransaksi(d) { return this.transaksiRepo.simpan(this.#buat(d)); }
    ubahTransaksi(id, d) { const t = this.#buat(d); t.setId(id); const lama = this.transaksiRepo.cariById(id); t._createdAt = lama._createdAt; return this.transaksiRepo.perbarui(t); }
    hapusTransaksi(id) { this.transaksiRepo.hapus(id); }
    tampilkanRiwayat(f = {}) {
        return this.transaksiRepo.cariByPeriode(f.awal, f.akhir).filter(t => (!f.kategoriId || t.getKategori()?.getId() === +f.kategoriId) && (!f.tipe || t.getTipe() === f.tipe))
            .sort((a, b) => b.getTanggal().localeCompare(a.getTanggal()) || b.getId() - a.getId());
    }
}
class KlasifikasiService {
    constructor(tRepo) { this.transaksiRepo = tRepo; }
    tentukanJenis(id, jenis) { const p = this.transaksiRepo.cariById(id); if (!(p instanceof Pengeluaran)) throw new Error('Hanya pengeluaran yang punya jenis'); p.setJenis(jenis); this.transaksiRepo.perbarui(p); }
}

/* ===== ANGGOTA 4 (Kayana): Anggaran, AnggaranRepository, AnggaranService, Laporan* ===== */
class Anggaran extends BaseEntity {
    #bulan; #tahun; #total; #batas;
    constructor(bulan, tahun, total, batas = 0) { super(); Object.assign(this, {}); this.#bulan = bulan; this.#tahun = tahun; this.#total = +total; this.#batas = +batas; }
    getBulan() { return this.#bulan; } getTahun() { return this.#tahun; } getTotalAnggaran() { return this.#total; } getBatasHarian() { return this.#batas; }
    setTotalAnggaran(n) { this.#total = +n; } setBatasHarian(n) { this.#batas = +n; }
    validate() { return this.#total > 0 && this.#batas >= 0 && this.#batas <= this.#total; }
    toJSON() { return { ...this._base(), bulan: this.#bulan, tahun: this.#tahun, total: this.#total, batas: this.#batas }; }
}
class AnggaranRepository extends IRepository {
    constructor(s) { super(s, 'anggaran'); }
    _fromJSON(o) { return new Anggaran(o.bulan, o.tahun, o.total, o.batas)._muat(o); }
    cariByBulan(b, t) { return this.ambilSemua().find(a => a.getBulan() === b && a.getTahun() === t) || null; }
}
class AnggaranService {
    constructor(r) { this.anggaranRepo = r; }
    aturAnggaranBulanan(b, t, total) {
        const a = this.anggaranRepo.cariByBulan(b, t);
        if (a) { const batas = a.getBatasHarian(); a.setTotalAnggaran(total); a.setBatasHarian(Math.min(batas, +total)); if (!a.validate()) throw new Error('Total anggaran harus lebih dari 0'); return this.anggaranRepo.perbarui(a); }
        return this.anggaranRepo.simpan(new Anggaran(b, t, total));
    }
    aturBatasHarian(b, t, batas) {
        const a = this.anggaranRepo.cariByBulan(b, t); if (!a) throw new Error('Tetapkan total anggaran bulan itu terlebih dahulu');
        a.setBatasHarian(batas); if (!a.validate()) throw new Error('Batas harian tidak boleh melebihi total anggaran'); return this.anggaranRepo.perbarui(a);
    }
    hapusAnggaran(id) { this.anggaranRepo.hapus(id); }
    ambilSemua() { return this.anggaranRepo.ambilSemua().sort((a, b) => b.getTahun() - a.getTahun() || b.getBulan() - a.getBulan()); }
    ambilAnggaran(b, t) { return this.anggaranRepo.cariByBulan(b, t); }
}
class Laporan {
    _periodeAwal; _periodeAkhir; _dataTerfilter = []; _totalPemasukan = 0; _totalPengeluaran = 0;
    constructor(awal, akhir, data) { if (new.target === Laporan) throw new Error('Laporan abstract'); Object.assign(this, { _periodeAwal: awal, _periodeAkhir: akhir, _dataTerfilter: data }); }
    _hitungTotal() {
        this._totalPemasukan = this._dataTerfilter.filter(t => t instanceof Pemasukan).reduce((s, t) => s + t.getJumlah(), 0);
        this._totalPengeluaran = this._dataTerfilter.filter(t => t instanceof Pengeluaran).reduce((s, t) => s + t.getJumlah(), 0);
    }
    getSelisih() { return this._totalPemasukan - this._totalPengeluaran; }
    generate() { abstrak(); } tampilkan() { abstrak(); }
    _ringkas() { return `<div class="sum"><div class="card stat"><small>Total Pemasukan</small><h3 class="plus">${rp(this._totalPemasukan)}</h3></div><div class="card stat"><small>Total Pengeluaran</small><h3>${rp(this._totalPengeluaran)}</h3></div><div class="card stat"><small>Selisih</small><h3>${rp(this.getSelisih())}</h3></div></div>`; }
}
class LaporanPeriode extends Laporan {
    _rekapHarian = new Map();
    generate() {
        this._hitungTotal(); this._rekapHarian = new Map();
        [...this._dataTerfilter].sort((a, b) => a.getTanggal().localeCompare(b.getTanggal())).forEach(t => { const r = this._rekapHarian.get(t.getTanggal()) || { masuk: 0, keluar: 0 }; t instanceof Pemasukan ? r.masuk += t.getJumlah() : r.keluar += t.getJumlah(); this._rekapHarian.set(t.getTanggal(), r); });
    }
    tampilkan() {
        const rows = [...this._rekapHarian].map(([d, r]) => `<tr><td>${tgl(d)}</td><td class="n plus">${rp(r.masuk)}</td><td class="n">${rp(r.keluar)}</td><td class="n">${rp(r.masuk - r.keluar)}</td></tr>`).join('');
        return this._ringkas() + `<div class="card"><h3>Rekap Harian</h3><table><tr><th>Tanggal</th><th class="n">Pemasukan</th><th class="n">Pengeluaran</th><th class="n">Selisih</th></tr>${rows || '<tr><td colspan=4 class="empty">Tidak ada transaksi pada periode ini</td></tr>'}</table></div>`;
    }
}
class LaporanKategori extends Laporan {
    _kategori; _persen = 0; _semua;
    constructor(awal, akhir, data, kategori) { super(awal, akhir, data.filter(t => t.getKategori()?.getId() === kategori.getId())); this._kategori = kategori; this._semua = data; }
    generate() { this._hitungTotal(); const tot = this._semua.filter(t => t instanceof Pengeluaran).reduce((s, t) => s + t.getJumlah(), 0); this._persen = tot ? this._totalPengeluaran / tot * 100 : 0; }
    tampilkan() {
        const rows = this._dataTerfilter.map(t => `<tr><td>${tgl(t.getTanggal())}</td><td>${esc(t.getKeterangan())}</td><td class="n">${rp(t.getNominalEfektif())}</td></tr>`).join('');
        return this._ringkas() + `<div class="card"><h3>${esc(this._kategori.getNama())} <span class="pill">${this._persen.toFixed(1)}% dari total pengeluaran</span></h3><table><tr><th>Tanggal</th><th>Keterangan</th><th class="n">Nominal</th></tr>${rows || '<tr><td colspan=3 class="empty">Tidak ada transaksi</td></tr>'}</table></div>`;
    }
}
class LaporanService {
    constructor(tRepo, kRepo) { this.transaksiRepo = tRepo; this.kategoriRepo = kRepo; }
    terimaPermintaan(k) {
        if (k.awal && k.akhir && k.awal > k.akhir) throw new Error('Periode awal tidak boleh lebih besar dari periode akhir');
        const data = this.transaksiRepo.cariByPeriode(k.awal, k.akhir); let l;
        if (k.kategoriId) { const kat = this.kategoriRepo.cariById(+k.kategoriId); if (!kat) throw new Error('Kategori tidak ditemukan'); l = new LaporanKategori(k.awal, k.akhir, data, kat); }
        else l = new LaporanPeriode(k.awal, k.akhir, data);
        l.generate(); return l;
    }
}

/* ===== ANGGOTA 3 (Alsyan): PemantauService, InfoSaldo, Peringatan, RingkasanService, RingkasanPengeluaran ===== */
class InfoSaldo { constructor(o) { Object.assign(this, o); } }
class Peringatan { constructor(pesan, level) { this.pesan = pesan; this.level = level; } getPesan() { return this.pesan; } getLevel() { return this.level; } }
class PemantauService {
    constructor(tRepo, aRepo) { this.transaksiRepo = tRepo; this.anggaranRepo = aRepo; }
    #keluar(f) { return this.transaksiRepo.ambilSemua().filter(t => t instanceof Pengeluaran && f(t)).reduce((s, t) => s + t.getJumlah(), 0); }
    #ang() { const [b, t] = bt(hariIni()); return this.anggaranRepo.cariByBulan(b, t); }
    hitungPengeluaranHariIni() { return this.#keluar(t => t.getTanggal() === hariIni()); }
    hitungSaldo() { return this.transaksiRepo.ambilSemua().reduce((s, t) => s + t.getNominalEfektif(), 0); }
    hitungSisaBatasHarian() { const a = this.#ang(); return a ? a.getBatasHarian() - this.hitungPengeluaranHariIni() : 0; }
    hitungSisaAnggaranBulanan() { const a = this.#ang(), p = hariIni().slice(0, 7); return a ? a.getTotalAnggaran() - this.#keluar(t => t.getTanggal().startsWith(p)) : 0; }
    tampilkanInformasi() { const a = this.#ang(); return new InfoSaldo({ saldo: this.hitungSaldo(), pengeluaranHariIni: this.hitungPengeluaranHariIni(), sisaBatasHarian: this.hitungSisaBatasHarian(), sisaAnggaranBulanan: this.hitungSisaAnggaranBulanan(), batas: a ? a.getBatasHarian() : 0, total: a ? a.getTotalAnggaran() : 0 }); }
    cekPeringatan() {
        const i = this.tampilkanInformasi();
        if (!i.total) return new Peringatan('Belum ada anggaran bulan ini. Atur di menu Anggaran Bulanan.', LevelPeringatan.AMAN);
        if (i.sisaAnggaranBulanan < 0) return new Peringatan('Anggaran bulanan sudah terlampaui!', LevelPeringatan.MELEBIHI_BATAS);
        if (!i.batas) return new Peringatan('Batas harian belum diatur. Isi di menu Anggaran Bulanan agar peringatan harian aktif.', LevelPeringatan.AMAN);
        const pct = i.pengeluaranHariIni / i.batas * 100;
        if (pct > 100) return new Peringatan(`PERINGATAN! Pengeluaran hari ini melebihi batas harian (${Math.round(pct)}%).`, LevelPeringatan.MELEBIHI_BATAS);
        if (pct >= 80) return new Peringatan(`PERINGATAN! Pengeluaran hari ini sudah mencapai ${Math.round(pct)}% dari batas harian. Hemat ya!`, LevelPeringatan.HAMPIR_HABIS);
        return new Peringatan('Pengeluaran hari ini masih aman. Pertahankan!', LevelPeringatan.AMAN);
    }
}
class RingkasanPengeluaran {
    constructor(k, w) { this.totalKebutuhan = k; this.totalKeinginan = w; }
    getTotalKebutuhan() { return this.totalKebutuhan; } getTotalKeinginan() { return this.totalKeinginan; }
    getPersentaseKeinginan() { const t = this.totalKebutuhan + this.totalKeinginan; return t ? this.totalKeinginan / t * 100 : 0; }
}
class RingkasanService {
    constructor(tRepo) { this.transaksiRepo = tRepo; }
    buatRingkasan(b, t) {
        const p = this.transaksiRepo.ambilSemua().filter(x => x instanceof Pengeluaran && bt(x.getTanggal()).join() === [b, t].join());
        const jml = j => p.filter(x => x.getJenis() === j).reduce((s, x) => s + x.getJumlah(), 0);
        return new RingkasanPengeluaran(jml(JenisPengeluaran.KEBUTUHAN), jml(JenisPengeluaran.KEINGINAN));
    }
}

/* ===== UI (Controller halaman) ===== */
class App {
    page = 'dashboard'; edit = null; filter = {}; lap = null;
    constructor() {
        document.addEventListener('click', e => this.klik(e)); document.addEventListener('submit', e => this.kirim(e)); document.addEventListener('change', e => this.ubah(e));
        $('#loginForm').addEventListener('submit', e => { e.preventDefault(); this.masuk($('#namaUser').value.trim(), true); });
        $('#logout').onclick = () => { localStorage.removeItem('moneykos:user'); location.reload(); };
        $('#reset').onclick = () => { if (confirm('Hapus semua data akun ini?')) { Object.keys(localStorage).filter(k => k.startsWith(this.prefix)).forEach(k => localStorage.removeItem(k)); this.siapkan(); this.toast('Data direset'); this.render(); } };
        $('#nav').onclick = e => { const a = e.target.closest('a'); if (a) { this.page = a.dataset.page; this.edit = null; this.render(); } };
        const u = localStorage.getItem('moneykos:user'); u ? this.masuk(u, false) : $('#login').classList.remove('hidden');
    }
    masuk(nama, baru) {
        if (!nama) return; localStorage.setItem('moneykos:user', nama); this.nama = nama; this.prefix = `moneykos:${nama}:`;
        $('#login').classList.add('hidden'); $('#app').classList.remove('hidden'); $('#userName').textContent = '● ' + nama; this.siapkan();
        if (baru) this.toast(`Selamat datang kembali, ${nama}!`); this.render();
    }
    siapkan() {
        const s = new LocalStorageAdapter(this.prefix);
        this.kRepo = new KategoriRepository(s); this.tRepo = new TransaksiRepository(s, this.kRepo); this.aRepo = new AnggaranRepository(s);
        this.kSvc = new KategoriService(this.kRepo, this.tRepo); this.tSvc = new TransaksiService(this.tRepo, this.kRepo); this.klasSvc = new KlasifikasiService(this.tRepo);
        this.aSvc = new AnggaranService(this.aRepo); this.pSvc = new PemantauService(this.tRepo, this.aRepo); this.rSvc = new RingkasanService(this.tRepo); this.lSvc = new LaporanService(this.tRepo, this.kRepo);
        if (!this.kRepo.ambilSemua().length || !localStorage.getItem(this.prefix + 'seed2')) { this.seedKategori(); localStorage.setItem(this.prefix + 'seed2', '1'); }
    }
    seedKategori() {
        const P = 'PENGELUARAN', M = 'PEMASUKAN';
        [['Makan', P], ['Bayar Kos', P], ['Transportasi', P], ['Nongkrong', P], ['Rokok', P], ['Kopi & Minum', P], ['Laundry', P], ['Pulsa & Internet', P], ['Listrik & Air', P],
        ['Belanja Kebutuhan', P], ['Kuliah & Tugas', P], ['Kesehatan', P], ['Hiburan', P], ['Lainnya', P], ['Uang Kiriman', M], ['Gaji / Part-time', M], ['Beasiswa', M], ['Lainnya', M]]
            .forEach(([n, t]) => { try { this.kSvc.tambahKategori(n, t, ''); } catch (e) { /* sudah ada */ } });
    }
    toast(m, err) { $('#toast').innerHTML = `<div class="toast ${err === 'warn' ? 'warn' : err ? 'err' : ''}">${esc(m)}<span onclick="this.parentNode.remove()">✕</span></div>`; }
    coba(fn) { try { fn(); return true; } catch (e) { this.toast(e.message, true); return false; } }
    render() {
        document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.page === this.page));
        $('#tanggal').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const T = { dashboard: ['Dashboard Utama', 'Pantau saldo, anggaran harian, dan peringatan keuangan kos kamu.'], transaksi: ['Transaksi', 'Catat dan kelola pemasukan serta pengeluaran.'], kategori: ['Kategori', 'Kelola kategori pemasukan dan pengeluaran.'], anggaran: ['Anggaran Bulanan', 'Atur anggaran bulanan dan batas pengeluaran harian.'], laporan: ['Laporan Keuangan', 'Lihat rekap per periode atau per kategori.'] }[this.page];
        $('#title').textContent = T[0]; $('#subtitle').textContent = T[1]; $('#view').innerHTML = this['v_' + this.page]();
    }
    /* --- Dashboard (Alsyan) --- */
    v_dashboard() {
        const i = this.pSvc.tampilkanInformasi(), [b, t] = bt(hariIni()), r = this.rSvc.buatRingkasan(b, t), tot = r.getTotalKebutuhan() + r.getTotalKeinginan() || 1;
        const last = this.tSvc.tampilkanRiwayat().slice(0, 5);
        const st = (j, v, s) => `<div class="card stat"><small>${j}</small><h3>${v}</h3><span class="muted">${s}</span></div>`;
        return `${this.banner()}
    <div class="stats">${st('Total Saldo', rp(i.saldo), 'Akumulasi Pemasukan - Pengeluaran')}${st('Pengeluaran Hari Ini', rp(i.pengeluaranHariIni), 'Hari ini')}${st('Sisa Batas Harian', rp(i.sisaBatasHarian), 'Batas: ' + rp(i.batas) + ' / hari')}${st('Sisa Anggaran Bulan Ini', rp(i.sisaAnggaranBulanan), 'Target: ' + rp(i.total))}</div>
    <div class="two"><div class="card"><div class="row"><h3>Kebutuhan vs Keinginan</h3><span class="muted">Bulan Ini</span></div>
      <p class="muted">Fitur 6.0 membantu mengevaluasi seberapa boros kamu membelanjakan uang kiriman kos untuk keinginan non-esensial.</p>
      <div class="row ok"><b>● Kebutuhan</b><b>${rp(r.getTotalKebutuhan())}</b></div><div class="bar"><i style="width:${r.getTotalKebutuhan() / tot * 100}%;background:#4fb77f"></i></div>
      <div class="row" style="color:var(--red)"><b>● Keinginan</b><b>${rp(r.getTotalKeinginan())}</b></div><div class="bar"><i style="width:${r.getTotalKeinginan() / tot * 100}%;background:#e05468"></i></div>
      <div class="row"><span class="muted">Persentase Keinginan:</span><span class="pill">${r.getPersentaseKeinginan().toFixed(1)}% dari Total Pengeluaran</span></div></div>
    <div class="card"><div class="row"><h3>Transaksi Terakhir</h3><a class="ok" style="cursor:pointer;font-weight:600" data-go="transaksi">Lihat Semua →</a></div>${this.tabelTx(last, false)}</div></div>`;
    }
    banner() {
        const w = this.pSvc.cekPeringatan(), cls = { AMAN: 'AMAN', 'HAMPIR HABIS': 'HAMPIR', 'MELEBIHI BATAS': 'LEBIH' }[w.getLevel()], ic = { AMAN: '✅', HAMPIR: '🔔', LEBIH: '⛔' }[cls];
        return `<div class="alert ${cls}"><span class="ic">${ic}</span><div><b>Status Peringatan: ${w.getLevel()}</b><p>${esc(w.getPesan())}</p></div></div>`;
    }
    badge(t) { return t instanceof Pemasukan ? '<span class="badge b-in">Pemasukan</span>' : t.getJenis() === 'KEBUTUHAN' ? '<span class="badge b-need">Kebutuhan</span>' : '<span class="badge b-want">Keinginan</span>'; }
    tabelTx(list, aksi) {
        const rows = list.map(t => `<tr><td>${tgl(t.getTanggal())}</td><td>${esc(t.getKategori()?.getNama() ?? '-')}</td><td class="muted">${esc(t.getKeterangan())}</td>
      <td>${aksi && t instanceof Pengeluaran ? `<select data-jenis="${t.getId()}"><option value="KEBUTUHAN" ${t.getJenis() === 'KEBUTUHAN' ? 'selected' : ''}>Kebutuhan</option><option value="KEINGINAN" ${t.getJenis() === 'KEINGINAN' ? 'selected' : ''}>Keinginan</option></select>` : this.badge(t)}</td>
      <td class="n ${t instanceof Pemasukan ? 'plus' : 'minus'}">${t instanceof Pemasukan ? '+ ' : '- '}${rp(t.getJumlah())}</td>${aksi ? `<td class="n"><button class="btn sm ghost" data-edit-tx="${t.getId()}">Ubah</button> <button class="btn sm del" data-del-tx="${t.getId()}">Hapus</button></td>` : ''}</tr>`).join('');
        return `<table><tr><th>Tanggal</th><th>Kategori</th><th>Keterangan</th><th>Jenis</th><th class="n">Nominal</th>${aksi ? '<th></th>' : ''}</tr>${rows || '<tr><td colspan=6 class="empty">Belum ada transaksi</td></tr>'}</table>`;
    }
    /* --- Transaksi (Daffa) --- */
    v_transaksi() {
        const e = this.edit ? this.tRepo.cariById(this.edit) : null, tipe = e ? e.getTipe() : (this.tipeForm || 'PENGELUARAN'), kats = this.kSvc.ambilKategoriByTipe(tipe), f = this.filter;
        const opt = (list, sel) => list.map(k => `<option value="${k.getId()}" ${k.getId() === sel ? 'selected' : ''}>${esc(k.getNama())}</option>`).join('');
        return `${this.banner()}<div class="card"><h3>${e ? 'Ubah' : 'Tambah'} Transaksi</h3><form class="f" id="fTx">
      <div><label>Tipe</label><select id="txTipe" ${e ? 'disabled' : ''}><option value="PENGELUARAN" ${tipe === 'PENGELUARAN' ? 'selected' : ''}>Pengeluaran</option><option value="PEMASUKAN" ${tipe === 'PEMASUKAN' ? 'selected' : ''}>Pemasukan</option></select></div>
      <div><label>Tanggal</label><input type="date" name="tanggal" value="${e ? e.getTanggal() : hariIni()}" required></div>
      <div><label>Kategori</label><select name="kategoriId" required><option value="">Pilih kategori</option>${opt(kats, e?.getKategori()?.getId())}</select>${kats.length ? '' : `<small class="muted">Belum ada kategori ${tipe.toLowerCase()}. <a class="ok" style="cursor:pointer" data-go="kategori">Tambah di menu Kategori</a></small>`}</div>
      <div><label>Nominal (Rp)</label><input type="number" name="jumlah" min="1" value="${e ? e.getJumlah() : ''}" required></div>
      <div><label>Keterangan</label><input name="keterangan" value="${esc(e?.getKeterangan() ?? '')}"></div>
      ${tipe === 'PENGELUARAN' ? `<div><label>Jenis</label><select name="jenis"><option value="KEBUTUHAN" ${e?.getJenis?.() === 'KEBUTUHAN' ? 'selected' : ''}>Kebutuhan</option><option value="KEINGINAN" ${e?.getJenis?.() === 'KEINGINAN' ? 'selected' : ''}>Keinginan</option></select></div>` : ''}
      <div><button class="btn primary" type="submit">${e ? 'Simpan Perubahan' : 'Tambah'}</button> ${e ? '<button class="btn ghost" type="button" data-batal>Batal</button>' : ''}</div></form></div>
    <div class="card"><h3>Riwayat Transaksi</h3><form class="f" id="fFilter"><div><label>Dari</label><input type="date" name="awal" value="${f.awal || ''}"></div><div><label>Sampai</label><input type="date" name="akhir" value="${f.akhir || ''}"></div>
      <div><label>Kategori</label><select name="kategoriId"><option value="">Semua</option>${opt(this.kSvc.ambilSemuaKategori(), +f.kategoriId)}</select></div><div><button class="btn ghost" type="submit">Terapkan Filter</button></div></form>
      ${this.tabelTx(this.tSvc.tampilkanRiwayat(f), true)}</div>`;
    }
    /* --- Kategori (Archy) --- */
    v_kategori() {
        const e = this.edit ? this.kRepo.cariById(this.edit) : null;
        const rows = this.kSvc.ambilSemuaKategori().map(k => `<tr><td>${esc(k.getNama())}</td><td><span class="badge ${k.getTipe() === 'PEMASUKAN' ? 'b-in' : 'b-want'}">${k.getTipe() === 'PEMASUKAN' ? 'Pemasukan' : 'Pengeluaran'}</span></td><td class="muted">${esc(k.getDeskripsi())}</td><td class="n"><button class="btn sm ghost" data-edit-kat="${k.getId()}">Ubah</button> <button class="btn sm del" data-del-kat="${k.getId()}">Hapus</button></td></tr>`).join('');
        return `<div class="card"><div class="row"><h3>${e ? 'Ubah' : 'Tambah'} Kategori</h3><button class="btn sm ghost" data-seed>Pulihkan kategori bawaan</button></div><form class="f" id="fKat"><div><label>Nama</label><input name="nama" value="${esc(e?.getNama() ?? '')}" required></div>
      <div><label>Tipe</label><select name="tipe"><option value="PENGELUARAN" ${e?.getTipe() === 'PENGELUARAN' ? 'selected' : ''}>Pengeluaran</option><option value="PEMASUKAN" ${e?.getTipe() === 'PEMASUKAN' ? 'selected' : ''}>Pemasukan</option></select></div>
      <div><label>Deskripsi</label><input name="deskripsi" value="${esc(e?.getDeskripsi() ?? '')}"></div><div><button class="btn primary">${e ? 'Simpan Perubahan' : 'Tambah'}</button> ${e ? '<button class="btn ghost" type="button" data-batal>Batal</button>' : ''}</div></form></div>
    <div class="card"><table><tr><th>Nama</th><th>Tipe</th><th>Deskripsi</th><th></th></tr>${rows}</table></div>`;
    }
    /* --- Anggaran (Kayana) --- */
    v_anggaran() {
        const e = this.edit ? this.aRepo.cariById(this.edit) : null, bulan = e ? `${e.getTahun()}-${pad(e.getBulan())}` : hariIni().slice(0, 7);
        const rows = this.aSvc.ambilSemua().map(a => `<tr><td>${pad(a.getBulan())}/${a.getTahun()}</td><td class="n">${rp(a.getTotalAnggaran())}</td><td class="n">${rp(a.getBatasHarian())}</td><td class="n"><button class="btn sm ghost" data-edit-ang="${a.getId()}">Ubah</button> <button class="btn sm del" data-del-ang="${a.getId()}">Hapus</button></td></tr>`).join('');
        return `<div class="card"><h3>${e ? 'Ubah' : 'Atur'} Anggaran</h3><form class="f" id="fAng"><div><label>Bulan</label><input type="month" name="bulan" value="${bulan}" required></div>
      <div><label>Total Anggaran (Rp)</label><input type="number" name="total" min="1" value="${e ? e.getTotalAnggaran() : ''}" required></div><div><label>Batas Harian (Rp)</label><input type="number" name="batas" min="0" value="${e ? e.getBatasHarian() : ''}"></div>
      <div><button class="btn primary">Simpan</button> ${e ? '<button class="btn ghost" type="button" data-batal>Batal</button>' : ''}</div></form></div>
    <div class="card"><table><tr><th>Bulan</th><th class="n">Total Anggaran</th><th class="n">Batas Harian</th><th></th></tr>${rows || '<tr><td colspan=4 class="empty">Belum ada anggaran</td></tr>'}</table></div>`;
    }
    /* --- Laporan (Kayana) --- */
    v_laporan() {
        const f = this.filter, d = new Date(), awal = f.lawal || `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`, akhir = f.lakhir || hariIni();
        return `<div class="card"><form class="f" id="fLap"><div><label>Dari</label><input type="date" name="awal" value="${awal}" required></div><div><label>Sampai</label><input type="date" name="akhir" value="${akhir}" required></div>
      <div><label>Kategori</label><select name="kategoriId"><option value="">Semua (per periode)</option>${this.kSvc.ambilSemuaKategori().map(k => `<option value="${k.getId()}" ${+f.lkat === k.getId() ? 'selected' : ''}>${esc(k.getNama())}</option>`).join('')}</select></div>
      <div><button class="btn primary">Tampilkan Laporan</button></div></form></div>${this.lap ? this.lap.tampilkan() : ''}`;
    }
    /* --- Event --- */
    klik(e) {
        const t = e.target, d = t.dataset;
        if (d.go) { this.page = d.go; this.render(); }
        else if ('batal' in d) { this.edit = null; this.render(); }
        else if ('seed' in d) { this.seedKategori(); this.toast('Kategori bawaan dipulihkan'); this.render(); }
        else if (d.editTx) { this.edit = +d.editTx; this.render(); } else if (d.editKat) { this.edit = +d.editKat; this.render(); } else if (d.editAng) { this.edit = +d.editAng; this.render(); }
        else if (d.delTx && confirm('Hapus transaksi ini?')) { this.tSvc.hapusTransaksi(+d.delTx); this.render(); }
        else if (d.delKat && confirm('Hapus kategori ini?')) { if (this.coba(() => this.kSvc.hapusKategori(+d.delKat))) this.render(); }
        else if (d.delAng && confirm('Hapus anggaran ini?')) { this.aSvc.hapusAnggaran(+d.delAng); this.render(); }
    }
    ubah(e) {
        const t = e.target;
        if (t.id === 'txTipe') { this.tipeForm = t.value; this.render(); }
        else if (t.dataset.jenis) { this.coba(() => this.klasSvc.tentukanJenis(+t.dataset.jenis, t.value)); this.render(); }
    }
    kirim(e) {
        const f = e.target; if (f.id === 'loginForm') return; e.preventDefault(); const d = Object.fromEntries(new FormData(f));
        if (f.id === 'fTx') { if (this.coba(() => this.edit ? this.tSvc.ubahTransaksi(this.edit, d) : this.tSvc.tambahTransaksi(d))) { const w = this.pSvc.cekPeringatan(), lv = w.getLevel(); this.toast(lv === LevelPeringatan.AMAN ? (this.edit ? 'Transaksi diubah' : 'Transaksi ditambahkan') : w.getPesan(), lv === LevelPeringatan.MELEBIHI_BATAS ? true : lv === LevelPeringatan.HAMPIR_HABIS ? 'warn' : false); this.edit = null; this.render(); } }
        else if (f.id === 'fFilter') { this.filter = { ...this.filter, ...d }; this.render(); }
        else if (f.id === 'fKat') { if (this.coba(() => this.edit ? this.kSvc.ubahKategori(this.edit, d) : this.kSvc.tambahKategori(d.nama, d.tipe, d.deskripsi))) { this.toast('Kategori disimpan'); this.edit = null; this.render(); } }
        else if (f.id === 'fAng') {
            const [th, bl] = d.bulan.split('-').map(Number);
            if (this.coba(() => { this.aSvc.aturAnggaranBulanan(bl, th, d.total); if (d.batas !== '') this.aSvc.aturBatasHarian(bl, th, d.batas); })) { this.toast('Anggaran disimpan'); this.edit = null; this.render(); }
        }
        else if (f.id === 'fLap') { this.filter = { ...this.filter, lawal: d.awal, lakhir: d.akhir, lkat: d.kategoriId }; this.coba(() => { this.lap = this.lSvc.terimaPermintaan(d); }); this.render(); }
    }
}
new App();