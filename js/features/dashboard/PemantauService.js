import { bt, hariIni, LevelPeringatan } from '../../core/utils.js';
import { Pengeluaran } from '../transaksi/Transaksi.js';
import { InfoSaldo, Peringatan } from './Peringatan.js';

export class PemantauService {
    constructor(transaksiRepo, anggaranRepo) {
        this.transaksiRepo = transaksiRepo;
        this.anggaranRepo = anggaranRepo;
    }

    #keluar(filter) {
        return this.transaksiRepo
            .ambilSemua()
            .filter((t) => t instanceof Pengeluaran && filter(t))
            .reduce((s, t) => s + t.getJumlah(), 0);
    }

    #anggaranBulanIni() {
        const [bulan, tahun] = bt(hariIni());
        return this.anggaranRepo.cariByBulan(bulan, tahun);
    }

    hitungPengeluaranHariIni() {
        return this.#keluar((t) => t.getTanggal() === hariIni());
    }

    hitungSaldo() {
        return this.transaksiRepo.ambilSemua().reduce((s, t) => s + t.getNominalEfektif(), 0);
    }

    hitungSisaBatasHarian() {
        const anggaran = this.#anggaranBulanIni();
        return anggaran ? anggaran.getBatasHarian() - this.hitungPengeluaranHariIni() : 0;
    }

    hitungSisaAnggaranBulanan() {
        const anggaran = this.#anggaranBulanIni();
        const prefixBulan = hariIni().slice(0, 7);

        return anggaran
            ? anggaran.getTotalAnggaran() - this.#keluar((t) => t.getTanggal().startsWith(prefixBulan))
            : 0;
    }

    tampilkanInformasi() {
        const anggaran = this.#anggaranBulanIni();

        return new InfoSaldo({
            saldo: this.hitungSaldo(),
            pengeluaranHariIni: this.hitungPengeluaranHariIni(),
            sisaBatasHarian: this.hitungSisaBatasHarian(),
            sisaAnggaranBulanan: this.hitungSisaAnggaranBulanan(),
            batas: anggaran ? anggaran.getBatasHarian() : 0,
            total: anggaran ? anggaran.getTotalAnggaran() : 0,
        });
    }

    cekPeringatan() {
        const info = this.tampilkanInformasi();

        if (!info.total) {
            return new Peringatan(
                'Belum ada anggaran bulan ini. Atur di menu Anggaran Bulanan.',
                LevelPeringatan.AMAN
            );
        }
        if (info.sisaAnggaranBulanan < 0) {
            return new Peringatan('Anggaran bulanan sudah terlampaui!', LevelPeringatan.MELEBIHI_BATAS);
        }
        if (!info.batas) {
            return new Peringatan(
                'Batas harian belum diatur. Isi di menu Anggaran Bulanan agar peringatan harian aktif.',
                LevelPeringatan.AMAN
            );
        }

        const persen = (info.pengeluaranHariIni / info.batas) * 100;
        if (persen > 100) {
            return new Peringatan(
                `PERINGATAN! Pengeluaran hari ini melebihi batas harian (${Math.round(persen)}%).`,
                LevelPeringatan.MELEBIHI_BATAS
            );
        }
        if (persen >= 80) {
            return new Peringatan(
                `PERINGATAN! Pengeluaran hari ini sudah mencapai ${Math.round(persen)}% dari batas harian. Hemat ya!`,
                LevelPeringatan.HAMPIR_HABIS
            );
        }
        return new Peringatan('Pengeluaran hari ini masih aman. Pertahankan!', LevelPeringatan.AMAN);
    }
}
