import { IRepository } from '../../core/IRepository.js';
import { Kategori } from './Kategori.js';

export class KategoriRepository extends IRepository {
    constructor(storage) {
        super(storage, 'kategori');
    }

    _fromJSON(o) {
        return new Kategori(o.nama, o.tipe, o.deskripsi)._muat(o);
    }

    cariByNama(nama) {
        return (
            this.ambilSemua().find((k) => k.getNama().toLowerCase() === nama.toLowerCase()) || null
        );
    }
}
