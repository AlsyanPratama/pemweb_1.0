import { Kategori } from './Kategori.js';

export class KategoriService {
    constructor(kategoriRepo, transaksiRepo) {
        this.kategoriRepo = kategoriRepo;
        this.transaksiRepo = transaksiRepo;
    }

    #cekNama(nama, tipe, idLain = 0) {
        const namaBaru = nama.trim().toLowerCase();
        const duplikat = this.kategoriRepo
            .ambilSemua()
            .some(
                (k) =>
                    k.getId() !== idLain &&
                    k.getTipe() === tipe &&
                    k.getNama().toLowerCase() === namaBaru
            );

        if (duplikat) throw new Error('Nama kategori sudah ada pada tipe yang sama');
    }

    tambahKategori(nama, tipe, deskripsi) {
        this.#cekNama(nama, tipe);
        return this.kategoriRepo.simpan(new Kategori(nama.trim(), tipe, deskripsi));
    }

    ubahKategori(id, { nama, tipe, deskripsi }) {
        const kategori = this.kategoriRepo.cariById(id);
        if (!kategori) throw new Error('Kategori tidak ditemukan');

        this.#cekNama(nama, tipe, id);

        kategori.setNama(nama.trim());
        kategori.setTipe(tipe);
        kategori.setDeskripsi(deskripsi);
        if (!kategori.validate()) throw new Error('Data tidak valid');

        return this.kategoriRepo.perbarui(kategori);
    }

    hapusKategori(id) {
        const dipakai = this.transaksiRepo.ambilSemua().some((t) => t.getKategori()?.getId() === id);
        if (dipakai) throw new Error('Kategori masih dipakai transaksi, tidak bisa dihapus');

        this.kategoriRepo.hapus(id);
    }

    ambilSemuaKategori() {
        return this.kategoriRepo.ambilSemua();
    }

    ambilKategoriByTipe(tipe) {
        return this.ambilSemuaKategori().filter((k) => k.getTipe() === tipe);
    }
}
