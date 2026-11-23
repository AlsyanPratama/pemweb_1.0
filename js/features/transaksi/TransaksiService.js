import { TipeTransaksi } from '../../core/utils.js';
import { Pemasukan, Pengeluaran } from './Transaksi.js';

export class TransaksiService {
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
