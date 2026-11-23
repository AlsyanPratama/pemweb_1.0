import { abstrak } from './utils.js';

/** Kontrak CRUD (interface) + implementasi dasar berbasis IStorage; subclass hanya mengisi _fromJSON(). */
export class IRepository {
    #storage;
    #kunci;

    constructor(storage, kunci) {
        if (new.target === IRepository) throw new Error('IRepository interface');
        this.#storage = storage;
        this.#kunci = kunci;
    }

    _fromJSON(o) { abstrak(); }

    #data() {
        return JSON.parse(this.#storage.baca(this.#kunci) || '{"next":1,"items":[]}');
    }

    #simpanData(data) {
        this.#storage.tulis(this.#kunci, JSON.stringify(data));
    }

    ambilSemua() {
        return this.#data().items.map((o) => this._fromJSON(o));
    }

    cariById(id) {
        const o = this.#data().items.find((x) => x.id === id);
        return o ? this._fromJSON(o) : null;
    }

    simpan(entitas) {
        if (!entitas.validate()) throw new Error('Data tidak valid');

        const data = this.#data();
        entitas.setId(data.next++);
        data.items.push(entitas.toJSON());
        this.#simpanData(data);
        return entitas;
    }

    perbarui(entitas) {
        const data = this.#data();
        const idx = data.items.findIndex((x) => x.id === entitas.getId());
        if (idx < 0) throw new Error('Data tidak ditemukan');

        entitas._perbaruiWaktu();
        data.items[idx] = entitas.toJSON();
        this.#simpanData(data);
        return entitas;
    }

    hapus(id) {
        const data = this.#data();
        data.items = data.items.filter((x) => x.id !== id);
        this.#simpanData(data);
    }
}
