import { LaporanPeriode, LaporanKategori } from './Laporan.js';

export class LaporanService {
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
