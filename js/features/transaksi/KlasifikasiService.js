import { Pengeluaran } from './Transaksi.js';

export class KlasifikasiService {
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
