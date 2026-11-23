import { LocalStorageAdapter } from './LocalStorageAdapter.js';
import { KategoriRepository } from '../features/kategori/KategoriRepository.js';
import { KategoriService } from '../features/kategori/KategoriService.js';
import { KATEGORI_BAWAAN } from '../features/kategori/kategoriBawaan.js';
import { TransaksiRepository } from '../features/transaksi/TransaksiRepository.js';
import { TransaksiService } from '../features/transaksi/TransaksiService.js';
import { KlasifikasiService } from '../features/transaksi/KlasifikasiService.js';
import { AnggaranRepository } from '../features/anggaran/AnggaranRepository.js';
import { AnggaranService } from '../features/anggaran/AnggaranService.js';
import { LaporanService } from '../features/laporan/LaporanService.js';
import { PemantauService } from '../features/dashboard/PemantauService.js';
import { RingkasanService } from '../features/dashboard/RingkasanService.js';

/** Isi kategori bawaan (kategori yang sudah ada dilewati). */
export function isiKategoriBawaan(kSvc) {
    KATEGORI_BAWAAN.forEach(([nama, tipe]) => {
        try {
            kSvc.tambahKategori(nama, tipe, '');
        } catch (e) { /* sudah ada */ }
    });
}

/** Membuat semua repository + service untuk satu pengguna (prefix = 'moneykos:<nama>:'). */
export function buatContainer(prefix) {
    const storage = new LocalStorageAdapter(prefix);

    const kRepo = new KategoriRepository(storage);
    const tRepo = new TransaksiRepository(storage, kRepo);
    const aRepo = new AnggaranRepository(storage);

    const kSvc = new KategoriService(kRepo, tRepo);
    const tSvc = new TransaksiService(tRepo, kRepo);
    const klasSvc = new KlasifikasiService(tRepo);
    const aSvc = new AnggaranService(aRepo);
    const pSvc = new PemantauService(tRepo, aRepo);
    const rSvc = new RingkasanService(tRepo);
    const lSvc = new LaporanService(tRepo, kRepo);

    if (!kRepo.ambilSemua().length || !localStorage.getItem(prefix + 'seed2')) {
        isiKategoriBawaan(kSvc);
        localStorage.setItem(prefix + 'seed2', '1');
    }

    return { kRepo, tRepo, aRepo, kSvc, tSvc, klasSvc, aSvc, pSvc, rSvc, lSvc };
}
