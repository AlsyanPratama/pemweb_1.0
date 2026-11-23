import { bt, JenisPengeluaran } from '../../core/utils.js';
import { Pengeluaran } from '../transaksi/Transaksi.js';

export class RingkasanPengeluaran {
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

export class RingkasanService {
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
