import { BaseEntity } from '../../core/BaseEntity.js';
import { TipeTransaksi } from '../../core/utils.js';

export class Kategori extends BaseEntity {
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
