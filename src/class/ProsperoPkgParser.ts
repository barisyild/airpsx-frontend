interface ProsperoPkgHeader {
    entryCount: number;
    fileTableOffset: number;
}

interface ProsperoPkgEntry {
    type: number;
    unk1: number;
    flags1: number;
    flags2: number;
    offset: number;
    size: number;
    padding: Uint8Array;
    keyIndex: number;
    isEncrypted: boolean;
}

interface LocalizedParameter {
    titleName: string;
    [key: string]: any;
}

interface PlayGoJson {
    localizedParameters: {
        defaultLanguage: string;
        [language: string]: string | LocalizedParameter;
    };
    titleId: string;
    [key: string]: any;
}

interface ProsperoPkgSfo {
    TITLE: string;
    TITLE_ID: string;
}

interface ProsperoPkgParseResult {
    icon: ArrayBuffer | null;
    sfo: ProsperoPkgSfo;
}

export class ProsperoPkgParser {
    private file: File;
    private littleCache: number | null = null;
    private entriesCache: ProsperoPkgEntry[] | null = null;

    public constructor(file: File) {
        this.file = file;           // Blob or File
    }

    // ===========================
    // LOW-LEVEL HELPERS
    // ===========================

    private async readBuffer(offset: number, length: number): Promise<ArrayBuffer> {
        const end = Math.min(offset + length, this.file.size);
        const blob = this.file.slice(offset, end);
        return await blob.arrayBuffer();
    }

    private async readView(offset: number, length: number): Promise<DataView> {
        const buf = await this.readBuffer(offset, length);
        return new DataView(buf);
    }

    // ===========================
    // STEP 1 — Little Endian Offset
    // ===========================

    private async readMainOffset(): Promise<number> {
        if (this.littleCache) return this.littleCache;

        const view = await this.readView(0x58, 8);
        const offset = view.getBigInt64(0, true);   // little-endian

        const offNum = Number(offset);
        this.littleCache = offNum;
        return offNum;
    }

    // ===========================
    // STEP 2 — BIG ENDIAN HEADER
    // ===========================

    private async readHeader(): Promise<ProsperoPkgHeader> {
        const base = await this.readMainOffset();

        const view = await this.readView(base + 0x10, 0x10);

        // big-endian
        const entryCount      = view.getUint32(0x00, false);
        const fileTableOffset = view.getUint32(0x08, false);

        return { entryCount, fileTableOffset };
    }

    // ===========================
    // ENTRY TABLE
    // ===========================

    private async readEntries(): Promise<ProsperoPkgEntry[]> {
        if (this.entriesCache) return this.entriesCache;

        const base = await this.readMainOffset();
        const hdr  = await this.readHeader();

        const entrySize = 0x20;
        const totalSize = hdr.entryCount * entrySize;

        const view = await this.readView(base + hdr.fileTableOffset, totalSize);
        const entries: ProsperoPkgEntry[] = [];

        for (let i = 0; i < hdr.entryCount; i++) {
            const off = i * entrySize;

            const type   = view.getUint32(off + 0x00, false);
            const unk1   = view.getUint32(off + 0x04, false);
            const flags1 = view.getUint32(off + 0x08, false);
            const flags2 = view.getUint32(off + 0x0C, false);

            const fileOffset = view.getUint32(off + 0x10, false);
            const size       = view.getUint32(off + 0x14, false);

            // padding 8 byte
            const pad = new Uint8Array(
                view.buffer.slice(off + 0x18, off + 0x20)
            );

            const keyIndex = (flags2 & 0xF000) >> 12;
            const isEncrypted = (flags1 & 0x80000000) !== 0;

            entries.push({
                type,
                unk1,
                flags1,
                flags2,
                offset: fileOffset,
                size,
                padding: pad,
                keyIndex,
                isEncrypted
            });
        }

        this.entriesCache = entries;
        return entries;
    }

    // ===========================
    // FILE EXTRACTOR
    // (only non-encrypted)
    // ===========================

    public async parsePkg(): Promise<ProsperoPkgParseResult> {
        const base = await this.readMainOffset();
        const entries = await this.readEntries();

        const sfo: ProsperoPkgSfo = {TITLE: "", TITLE_ID: ""};
        let icon: ArrayBuffer | null = null;

        for (const e of entries) {
            let readSize = e.size;
            if (readSize % 0x10 !== 0) {
                //readSize += 0x10 - (readSize % 0x10);
            }

            const absOffset = base + e.offset;
            const buf = await this.readBuffer(absOffset, readSize);
            if (e.type === 8449) {
                const json = JSON.parse(new TextDecoder().decode(buf)) as PlayGoJson;
                console.log(json);

                const defaultLanguage = json.localizedParameters.defaultLanguage;
                const locParam = json.localizedParameters[defaultLanguage] as LocalizedParameter;

                sfo.TITLE = locParam.titleName;
                sfo.TITLE_ID = json.titleId;
            } else if (e.type === 4608) {
                // 4109
                // 4102
                icon = buf;
            }
        }

        return {icon: icon, sfo: sfo};
    }
}

