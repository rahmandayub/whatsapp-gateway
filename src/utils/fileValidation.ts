import { fileTypeFromBuffer } from 'file-type';
import fs from 'fs';

export const validateFileSignature = async (filePath: string, claimedMimeType: string): Promise<boolean> => {
    try {
        const fileBuffer = await fs.promises.readFile(filePath);
        // We only need the first few bytes, but file-type handles buffers well.
        // Reading the whole file might be heavy for large files, let's read a chunk.

        // Read first 4100 bytes (usually enough for magic numbers)
        const fd = await fs.promises.open(filePath, 'r');
        const buffer = Buffer.alloc(4100);
        await fd.read(buffer, 0, 4100, 0);
        await fd.close();

        const type = await fileTypeFromBuffer(buffer);

        if (!type) {
            // Some text files might not have magic numbers.
            // If claimed is text/*, we might be lenient or do extra checks.
            if (claimedMimeType.startsWith('text/')) {
                // Basic check for binary characters?
                // For now, if we can't determine type, and it claims to be text, we might allow it
                // BUT better to be strict if we want security.
                // However, csv/txt often don't have signatures.
                return true;
            }
            return false;
        }

        // Check if detected mime matches claimed mime
        // Note: 'application/xml' vs 'text/xml' etc can be tricky.
        // We do a basic check.

        // Handle common mismatches or generalizations
        if (claimedMimeType === type.mime) return true;

        // Specific allowances
        if (claimedMimeType === 'audio/mpeg' && type.mime === 'audio/mpeg') return true;

        // Microsoft Office files often detected as 'application/x-cfb' or zip
        if (claimedMimeType.includes('msword') || claimedMimeType.includes('officedocument')) {
             if (type.mime === 'application/x-cfb' || type.mime === 'application/zip') return true;
        }

        return false;
    } catch (error) {
        console.error('File signature validation error:', error);
        return false;
    }
};
