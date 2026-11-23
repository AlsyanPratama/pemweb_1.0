import { $, esc, pad, hariIni } from '../../core/utils.js';
import { initLayout, toast } from '../../core/layout.js';

const ctx = initLayout('laporan');

if (ctx) {
    const f = $('#fLap');
    const d = new Date();

    // Default periode: tanggal 1 bulan ini s/d hari ini
    f.elements.awal.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
    f.elements.akhir.value = hariIni();

    $('#lapKategori').innerHTML =
        '<option value="">Semua (per periode)</option>' +
        ctx.svc.kSvc
            .ambilSemuaKategori()
            .map((k) => `<option value="${k.getId()}">${esc(k.getNama())}</option>`)
            .join('');

    f.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(f));

        try {
            const laporan = ctx.svc.lSvc.terimaPermintaan(data);
            $('#hasil').innerHTML = laporan.tampilkan();
        } catch (err) {
            toast(err.message, true);
        }
    });
}
