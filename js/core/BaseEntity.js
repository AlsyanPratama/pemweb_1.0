import { abstrak } from './utils.js';

export class BaseEntity {
    _id = 0;
    _createdAt = new Date().toISOString();
    _updatedAt = this._createdAt;

    constructor() {
        if (new.target === BaseEntity) throw new Error('BaseEntity abstract');
    }

    getId() { return this._id; }
    setId(id) { this._id = id; }
    getCreatedAt() { return this._createdAt; }
    getUpdatedAt() { return this._updatedAt; }

    _perbaruiWaktu() {
        this._updatedAt = new Date().toISOString();
    }

    _base() {
        return { id: this._id, createdAt: this._createdAt, updatedAt: this._updatedAt };
    }

    _muat(o) {
        this._id = o.id;
        this._createdAt = o.createdAt;
        this._updatedAt = o.updatedAt;
        return this;
    }

    validate() { abstrak(); }
}
