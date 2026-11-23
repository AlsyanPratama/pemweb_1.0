import { IRepository } from '../../core/IRepository.js';
import { Anggaran } from './Anggaran.js';

export class AnggaranRepository extends IRepository {
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
