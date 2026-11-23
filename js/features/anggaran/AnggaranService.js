import { Anggaran } from './Anggaran.js';

export class AnggaranService {
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
