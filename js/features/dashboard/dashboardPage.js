import { $, rp, bt, hariIni } from '../../core/utils.js';
import { initLayout } from '../../core/layout.js';
import { banner } from './banner.js';
import { tabelTx } from '../transaksi/transaksiTabel.js';

const ctx = initLayout('dashboard');
if (ctx) render();

function render() {
    const { pSvc, rSvc, tSvc } = ctx.svc;

    const info = pSvc.tampilkanInformasi();
    const [bulan, tahun] = bt(hariIni());
    const ringkasan = rSvc.buatRingkasan(bulan, tahun);
    const total = ringkasan.getTotalKebutuhan() + ringkasan.getTotalKeinginan() || 1;
    const terakhir = tSvc.tampilkanRiwayat().slice(0, 5);

    $('#banner').innerHTML = banner(pSvc);

    $('#saldo').textContent = rp(info.saldo);
    $('#keluarHariIni').textContent = rp(info.pengeluaranHariIni);
    $('#sisaHarian').textContent = rp(info.sisaBatasHarian);
    $('#infoBatas').textContent = 'Batas: ' + rp(info.batas) + ' / hari';
    $('#sisaBulan').textContent = rp(info.sisaAnggaranBulanan);
    $('#infoTarget').textContent = 'Target: ' + rp(info.total);

    $('#totalKebutuhan').textContent = rp(ringkasan.getTotalKebutuhan());
    $('#totalKeinginan').textContent = rp(ringkasan.getTotalKeinginan());
    $('#barKebutuhan').style.width = (ringkasan.getTotalKebutuhan() / total) * 100 + '%';
    $('#barKeinginan').style.width = (ringkasan.getTotalKeinginan() / total) * 100 + '%';
    $('#persenKeinginan').textContent =
        ringkasan.getPersentaseKeinginan().toFixed(1) + '% dari Total Pengeluaran';

    $('#tabelTerakhir').innerHTML = tabelTx(terakhir, false);
}
