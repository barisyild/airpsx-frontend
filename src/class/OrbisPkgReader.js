export class OrbisPkgParser {
    #file;
    #decoder;
    #headerCache = null;
    #entriesCache = null;

    constructor(file) {
        this.#file = file;
        this.#decoder = new TextDecoder("utf-8");
    }

    // =====================================
    //           LOW-LEVEL HELPERS
    // =====================================

    async #readBuffer(offset, length) {
        const end = Math.min(offset + length, this.#file.size);
        const blob = this.#file.slice(offset, end);
        return await blob.arrayBuffer();
    }

    async #readView(offset, length) {
        const buf = await this.#readBuffer(offset, length);
        return new DataView(buf);
    }

    #readCStringLocal(view, start, maxLen) {
        const bytes = [];
        for (let i = start; i < maxLen; i++) {
            const b = view.getUint8(i);
            if (b === 0) break;
            bytes.push(b);
        }
        return this.#decoder.decode(new Uint8Array(bytes));
    }

    #readBytesLocal(view, start, length) {
        const out = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
            out[i] = view.getUint8(start + i);
        }
        return out;
    }

    // =====================================
    //               HEADER
    // =====================================

    async readHeader() {
        if (this.#headerCache) return this.#headerCache;

        const view = await this.#readView(0, 0x20);

        const magic = view.getUint32(0x00, false);
        if (magic !== 0x7F434E54) { // "\x7F C N T"
            throw new Error("PKG değil (magic uyuşmuyor).");
        }

        const header = {
            entryCount:  view.getUint32(0x10, false),
            tableOffset: view.getUint32(0x18, false)
        };

        this.#headerCache = header;
        return header;
    }

    // =====================================
    //           ENTRY TABLE
    // =====================================

    async readEntries() {
        if (this.#entriesCache) return this.#entriesCache;

        const hdr = await this.readHeader();
        const entrySize = 0x20;
        const totalSize = hdr.entryCount * entrySize;

        const view = await this.#readView(hdr.tableOffset, totalSize);
        const entries = [];

        for (let i = 0; i < hdr.entryCount; i++) {
            const off = i * entrySize;

            entries.push({
                id:         view.getUint32(off + 0x00, false),
                fileOffset: view.getUint32(off + 0x10, false),
                fileSize:   view.getUint32(off + 0x14, false)
            });
        }

        this.#entriesCache = entries;
        return entries;
    }

    // =====================================
    //                PARAM.SFO
    // =====================================

    /**
     * SFO = Entry Table'da ID 0x00001000
     */
    async extractSfo(sfoId = 0x00001000) {
        const entries = await this.readEntries();
        const ent = entries.find(e => e.id === sfoId);

        if (!ent) {
            throw new Error("PARAM.SFO entry table’da bulunamadı.");
        }

        const buf = await this.#readBuffer(ent.fileOffset, ent.fileSize);
        const view = new DataView(buf);
        const len = buf.byteLength;
        const dec = this.#decoder;

        const magic = view.getUint32(0x00, true);
        if (magic !== 0x46535000) { // "PSF\0"
            throw new Error("Geçersiz SFO magic.");
        }

        const keyOff     = view.getUint32(0x08, true);
        const dataOff    = view.getUint32(0x0C, true);
        const entryCount = view.getUint32(0x10, true);

        const indexBase = 0x14;
        const result = {};

        for (let i = 0; i < entryCount; i++) {
            const entOff = indexBase + i * 16;

            const keyRel = view.getUint16(entOff + 0, true);
            const fmt    = view.getUint16(entOff + 2, true);
            const dLen   = view.getUint32(entOff + 4, true);
            const dRel   = view.getUint32(entOff + 12, true);

            const keyStart  = keyOff  + keyRel;
            const dataStart = dataOff + dRel;

            const key = this.#readCStringLocal(view, keyStart, len);

            if (fmt === 0x0004 || fmt === 0x0204) {
                let raw = this.#readBytesLocal(view, dataStart, dLen);
                let end = raw.length;
                while (end > 0 && raw[end - 1] === 0) end--;
                result[key] = dec.decode(raw.slice(0, end));

            } else if (fmt === 0x0404) {
                result[key] = view.getUint32(dataStart, true);

            } else {
                result[key] = this.#readBytesLocal(view, dataStart, dLen);
            }
        }

        return result;
    }

    // =====================================
    //                 ICON0
    // =====================================

    /**
     * ICON0 (veya verilen ID) çıkarır.
     * ID 0x1200 genelde ICON0.PNG dosyasıdır.
     */
    async extractIcon(iconId = 0x00001200) {
        const entries = await this.readEntries();
        const ent = entries.find(e => e.id === iconId);

        if (!ent) {
            throw new Error("ICON0 bulunamadı.");
        }

        const buf = await this.#readBuffer(ent.fileOffset, ent.fileSize);
        return new Uint8Array(buf);
    }

    // =====================================
    //           KOLAY TOPLU API
    // =====================================

    async parsePkg() {
        const [sfo, icon] = await Promise.all([
            this.extractSfo(),
            this.extractIcon().catch(() => null)
        ]);

        return { sfo, icon };
    }
}