import { fileTypeFromBuffer } from 'file-type';
import fs from 'fs';
import { logger } from './logger.js';

function isControlChar(byte: number): boolean {
    return (
        (byte >= 0x00 && byte <= 0x08) ||
        (byte >= 0x0b && byte <= 0x0c) ||
        (byte >= 0x0e && byte <= 0x1f)
    );
}

export const validateFileSignature = async (
    filePath: string,
    claimedMimeType: string,
): Promise<boolean> => {
    try {
        // Read first 4100 bytes (usually enough for magic numbers)
        const fd = await fs.promises.open(filePath, 'r');
        const buffer = Buffer.alloc(4100);
        const { bytesRead } = await fd.read(buffer, 0, 4100, 0);
        await fd.close();

        const sample = buffer.subarray(0, bytesRead);
        const type = await fileTypeFromBuffer(sample);

        if (!type) {
            // Some text files might not have magic numbers.
            // If claimed is text/*, perform binary heuristic to prevent bypass.
            if (claimedMimeType.startsWith('text/')) {
                let controlCount = 0;
                for (let i = 0; i < sample.length; i++) {
                    if (isControlChar(sample[i])) {
                        controlCount++;
                    }
                }
                const ratio =
                    sample.length > 0 ? controlCount / sample.length : 0;
                return ratio <= 0.05; // Reject if >5% control characters
            }
            return false;
        }

        // Check if detected mime matches claimed mime
        // Note: 'application/xml' vs 'text/xml' etc can be tricky.
        // We do a basic check.

        // Handle common mismatches or generalizations
        if (claimedMimeType === type.mime) return true;

        // Specific allowances
        if (claimedMimeType === 'audio/mpeg' && type.mime === 'audio/mpeg')
            return true;

        // Microsoft Office files often detected as 'application/x-cfb' or zip
        if (
            claimedMimeType.includes('msword') ||
            claimedMimeType.includes('officedocument')
        ) {
            if (
                type.mime === 'application/x-cfb' ||
                type.mime === 'application/zip'
            )
                return true;
        }

        return false;
    } catch (error) {
        logger.error({ err: error }, 'File signature validation error');
        return false;
    }
};
