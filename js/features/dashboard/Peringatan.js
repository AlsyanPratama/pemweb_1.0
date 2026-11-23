export class InfoSaldo {
    constructor(o) {
        Object.assign(this, o);
    }
}

export class Peringatan {
    constructor(pesan, level) {
        this.pesan = pesan;
        this.level = level;
    }

    getPesan() { return this.pesan; }
    getLevel() { return this.level; }
}
