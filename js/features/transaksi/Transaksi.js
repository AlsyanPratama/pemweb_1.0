import { BaseEntity } from '../../core/BaseEntity.js';
import { abstrak, TipeTransaksi, JenisPengeluaran } from '../../core/utils.js';

export class Transaksi extends BaseEntity {
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

export class Pemasukan extends Transaksi {
    getTipe() { return TipeTransaksi.PEMASUKAN; }
    getNominalEfektif() { return this._jumlah; }
}

export class Pengeluaran extends Transaksi {
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
