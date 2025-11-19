import {ProsperoPkgParser} from "../class/ProsperoPkgParser";
import {OrbisPkgParser} from "../class/OrbisPkgReader";
import ApiService from "./ApiService";

const PKG_MAGIC = {
    PROSPERO: 0x7F464948,
    ORBIS: 0x7F434E54
};

interface PackageMetadata {
    title: string;
    titleId: string;
    iconPath: string | null;
}

export class PackageService {

    static PKG_MAGIC = PKG_MAGIC;

    /**
     * Extracts metadata (Title, ID, Icon) from the PKG file.
     * Handles both Prospero and Orbis formats with fallback mechanisms.
     */
    static async extractMetadataFromFile(file: File): Promise<PackageMetadata> {
        const magicBuffer = await file.slice(0, 4).arrayBuffer();
        const magic = new DataView(magicBuffer).getUint32(0x00, false);

        // Default values
        let title = "CUSA12345";
        let titleId = "CUSA12345";
        let iconPath: string | null = null;

        try {
            // Prospero PKG
            if (magic === PKG_MAGIC.PROSPERO) {
                try {
                    const parser = new ProsperoPkgParser(file);
                    const { sfo, icon } = await parser.parsePkg();
                    title = sfo.TITLE;
                    titleId = sfo.TITLE_ID;
                    if (icon) {
                        iconPath = `${ApiService.getApiUrl()}/api/fs/stream/${await ApiService.tempFile(icon)}`;
                    }
                } catch (e) {
                    console.warn("Prospero Parser failed, trying fallback...", e);

                    // Fallback: Read from metadata offset
                    const pkgBuf = await file.slice(0x58, 0x58 + 8).arrayBuffer();
                    const pkgOffset = parseInt(new DataView(pkgBuf).getBigInt64(0, true).toString());

                    const titleBuf = await file.slice(pkgOffset + 0x47, pkgOffset + 0x47 + 9).arrayBuffer();
                    title = titleId = new TextDecoder().decode(titleBuf);
                }
            }
            // Orbis PKG
            else if (magic === PKG_MAGIC.ORBIS) {
                try {
                    const parser = new OrbisPkgParser(file);
                    const { sfo, icon } = await parser.parsePkg();
                    title = sfo.TITLE as string;
                    titleId = sfo.TITLE_ID as string;
                    if (icon) {
                        iconPath = `${ApiService.getApiUrl()}/api/fs/stream/${await ApiService.tempFile(icon)}`;
                    }
                } catch (e) {
                    console.warn("Orbis Parser failed, trying fallback...", e);

                    // Fallback: Direct metadata read
                    const titleBuf = await file.slice(0x47, 0x47 + 9).arrayBuffer();
                    title = titleId = new TextDecoder().decode(titleBuf);
                }
            } else {
                throw new Error("Invalid PKG file format.");
            }
        } catch (error) {
            console.error("Metadata extraction failed completely:", error);
            // Re-throw to stop the upload process if invalid
            throw error;
        }

        return { title, titleId, iconPath };
    }
}

