import { describe, it, expect, vi, afterEach } from 'vitest';
import { validateFileSignature } from '../../utils/fileValidation.js';
import fs from 'fs';
import path from 'path';

describe('File Validation', () => {
    const testDir = path.resolve(process.cwd(), 'temp_test_files');

    const createTestFile = async (filename: string, content: Buffer) => {
        if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);
        const filepath = path.join(testDir, filename);
        await fs.promises.writeFile(filepath, content);
        return filepath;
    };

    afterEach(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    it('should validate PNG file correctly', async () => {
        // PNG Magic number: 89 50 4E 47 0D 0A 1A 0A
        const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        const filepath = await createTestFile('test.png', pngHeader);

        const isValid = await validateFileSignature(filepath, 'image/png');
        expect(isValid).toBe(true);
    });

    it('should reject file with mismatched extension and content', async () => {
        // JPEG Header: FF D8 FF
        const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF]);
        const filepath = await createTestFile('fake_png.png', jpegHeader);

        // We claim it's PNG, but it's JPEG
        const isValid = await validateFileSignature(filepath, 'image/png');
        expect(isValid).toBe(false);
    });

    it('should allow text files (no magic number)', async () => {
        const textContent = Buffer.from('Hello world');
        const filepath = await createTestFile('test.txt', textContent);

        const isValid = await validateFileSignature(filepath, 'text/plain');
        expect(isValid).toBe(true);
    });
});
