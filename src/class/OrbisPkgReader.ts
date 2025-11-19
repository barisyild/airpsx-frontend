interface PkgHeader {
    entryCount: number;
    tableOffset: number;
}

interface PkgEntry {
    id: number;
    fileOffset: number;
    fileSize: number;
}

interface SfoData {
    [key: string]: string | number | Uint8Array;
}

interface PkgParseResult {
    sfo: SfoData;
    icon: ArrayBuffer | null;
}

export class OrbisPkgParser {
    private file: File;
    private decoder: TextDecoder;
    private headerCache: PkgHeader | null = null;
    private entriesCache: PkgEntry[] | null = null;

    public constructor(file: File) {
        this.file = file;
        this.decoder = new TextDecoder("utf-8");
    }

    // =====================================
    //           LOW-LEVEL HELPERS
    // =====================================

    private async readBuffer(offset: number, length: number): Promise<ArrayBuffer> {
        const end = Math.min(offset + length, this.file.size);
        const blob = this.file.slice(offset, end);
        return await blob.arrayBuffer();
    }

    private async readView(offset: number, length: number): Promise<DataView> {
        const buf = await this.readBuffer(offset, length);
        return new DataView(buf);
    }

    private readCStringLocal(view: DataView, start: number, maxLen: number): string {
        const bytes: number[] = [];
        for (let i = start; i < maxLen; i++) {
            const b = view.getUint8(i);
            if (b === 0) break;
            bytes.push(b);
        }
        return this.decoder.decode(new Uint8Array(bytes));
    }

    private readBytesLocal(view: DataView, start: number, length: number): Uint8Array {
        const out = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
            out[i] = view.getUint8(start + i);
        }
        return out;
    }

    // =====================================
    //               HEADER
    // =====================================

    private async readHeader(): Promise<PkgHeader> {
        if (this.headerCache) return this.headerCache;

        const view = await this.readView(0, 0x20);

        const magic = view.getUint32(0x00, false);
        if (magic !== 0x7F434E54) { // "\x7F C N T"
            throw new Error("PKG değil (magic uyuşmuyor).");
        }

        const header: PkgHeader = {
            entryCount:  view.getUint32(0x10, false),
            tableOffset: view.getUint32(0x18, false)
        };

        this.headerCache = header;
        return header;
    }

    // =====================================
    //           ENTRY TABLE
    // =====================================

    private async readEntries(): Promise<PkgEntry[]> {
        if (this.entriesCache) return this.entriesCache;

        const hdr = await this.readHeader();
        const entrySize = 0x20;
        const totalSize = hdr.entryCount * entrySize;

        const view = await this.readView(hdr.tableOffset, totalSize);
        const entries: PkgEntry[] = [];

        for (let i = 0; i < hdr.entryCount; i++) {
            const off = i * entrySize;

            entries.push({
                id:         view.getUint32(off + 0x00, false),
                fileOffset: view.getUint32(off + 0x10, false),
                fileSize:   view.getUint32(off + 0x14, false)
            });
        }

        this.entriesCache = entries;
        return entries;
    }

    // =====================================
    //                PARAM.SFO
    // =====================================

    /**
     * SFO = Entry Table'da ID 0x00001000
     */
    private async extractSfo(sfoId: number = 0x00001000): Promise<SfoData> {
        const entries = await this.readEntries();
        const ent = entries.find(e => e.id === sfoId);

        if (!ent) {
            throw new Error("PARAM.SFO entry table'da bulunamadı.");
        }

        const buf = await this.readBuffer(ent.fileOffset, ent.fileSize);
        const view = new DataView(buf);
        const len = buf.byteLength;
        const dec = this.decoder;

        const magic = view.getUint32(0x00, true);
        if (magic !== 0x46535000) { // "PSF\0"
            throw new Error("Geçersiz SFO magic.");
        }

        const keyOff     = view.getUint32(0x08, true);
        const dataOff    = view.getUint32(0x0C, true);
        const entryCount = view.getUint32(0x10, true);

        const indexBase = 0x14;
        const result: SfoData = {};

        for (let i = 0; i < entryCount; i++) {
            const entOff = indexBase + i * 16;

            const keyRel = view.getUint16(entOff + 0, true);
            const fmt    = view.getUint16(entOff + 2, true);
            const dLen   = view.getUint32(entOff + 4, true);
            const dRel   = view.getUint32(entOff + 12, true);

            const keyStart  = keyOff  + keyRel;
            const dataStart = dataOff + dRel;

            const key = this.readCStringLocal(view, keyStart, len);

            if (fmt === 0x0004 || fmt === 0x0204) {
                let raw = this.readBytesLocal(view, dataStart, dLen);
                let end = raw.length;
                while (end > 0 && raw[end - 1] === 0) end--;
                result[key] = dec.decode(raw.slice(0, end));

            } else if (fmt === 0x0404) {
                result[key] = view.getUint32(dataStart, true);

            } else {
                result[key] = this.readBytesLocal(view, dataStart, dLen);
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
    private async extractIcon(iconId: number = 0x00001200): Promise<ArrayBuffer> {
        const entries = await this.readEntries();
        const ent = entries.find(e => e.id === iconId);

        if (!ent) {
            throw new Error("ICON0 bulunamadı.");
        }

        return await this.readBuffer(ent.fileOffset, ent.fileSize);
    }

    // =====================================
    //           KOLAY TOPLU API
    // =====================================

    public async parsePkg(): Promise<PkgParseResult> {
        const [sfo, icon] = await Promise.all([
            this.extractSfo(),
            this.extractIcon().catch(() => null)
        ]);

        return { sfo, icon };
    }
}

