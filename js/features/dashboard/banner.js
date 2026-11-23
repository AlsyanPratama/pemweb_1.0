import { esc } from '../../core/utils.js';

/** Banner "Status Peringatan" — dipakai di halaman Dashboard dan Transaksi. */
export function banner(pemantauService) {
    const peringatan = pemantauService.cekPeringatan();
    const kelas = { AMAN: 'AMAN', 'HAMPIR HABIS': 'HAMPIR', 'MELEBIHI BATAS': 'LEBIH' }[peringatan.getLevel()];
    const ikon = { AMAN: '✅', HAMPIR: '🔔', LEBIH: '⛔' }[kelas];

    return `
        <div class="alert ${kelas}">
            <span class="ic">${ikon}</span>
            <div><b>Status Peringatan: ${peringatan.getLevel()}</b><p>${esc(peringatan.getPesan())}</p></div>
        </div>`;
}
