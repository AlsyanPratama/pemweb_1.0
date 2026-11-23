import { BaseEntity } from '../../core/BaseEntity.js';

export class Anggaran extends BaseEntity {
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
