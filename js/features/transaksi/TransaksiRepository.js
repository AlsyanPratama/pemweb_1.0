import { IRepository } from '../../core/IRepository.js';
import { TipeTransaksi } from '../../core/utils.js';
import { Pemasukan, Pengeluaran } from './Transaksi.js';

export class TransaksiRepository extends IRepository {
    constructor(storage, kategoriRepo) {
        super(storage, 'transaksi');
        this.kategoriRepo = kategoriRepo;
    }

    _fromJSON(o) {
        const data = {
            jumlah: o.jumlah,
            tanggal: o.tanggal,
            keterangan: o.keterangan,
            kategori: this.kategoriRepo.cariById(o.kategoriId),
            jenis: o.jenis,
        };
        const transaksi =
            o.tipe === TipeTransaksi.PEMASUKAN ? new Pemasukan(data) : new Pengeluaran(data);

        return transaksi._muat(o);
    }

    cariByPeriode(awal, akhir) {
        return this.ambilSemua().filter(
            (t) => (!awal || t.getTanggal() >= awal) && (!akhir || t.getTanggal() <= akhir)
        );
    }

    cariByKategori(kategoriId) {
        return this.ambilSemua().filter((t) => t.getKategori()?.getId() === kategoriId);
    }
}
