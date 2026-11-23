import { IStorage } from './IStorage.js';

export class LocalStorageAdapter extends IStorage {
    #prefix;

    constructor(prefix) {
        super();
        this.#prefix = prefix;
    }

    baca(kunci) {
        return localStorage.getItem(this.#prefix + kunci);
    }

    tulis(kunci, data) {
        localStorage.setItem(this.#prefix + kunci, data);
    }

    hapus(kunci) {
        localStorage.removeItem(this.#prefix + kunci);
    }
}
