import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import sessionRoutes from '../../routes/sessionRoutes.js';
import whatsAppService from '../../services/whatsappService.js';
import { messageQueue } from '../../queues/messageQueue.js';
import { errorHandler } from '../../middlewares/errorHandler.js';
import path from 'path';
import fs from 'fs';

// Mock dependencies
vi.mock('../../services/whatsappService.js');
vi.mock('../../queues/messageQueue.js', () => ({
    messageQueue: {
        add: vi.fn().mockResolvedValue({ id: 'job_123' })
    }
}));

describe('Integration: File Upload', () => {
    let app: express.Application;
    const testDir = path.resolve(process.cwd(), 'temp_test_uploads');

    beforeEach(() => {
        app = express();
        app.use(express.json());
        // Mock auth middleware for test simplicity
        app.use((req, res, next) => { next(); });
        app.use('/sessions', sessionRoutes);
        app.use(errorHandler);

        if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);

        // Mock service status
        (whatsAppService.getSessionStatus as any).mockResolvedValue({ status: 'CONNECTED' });
    });

    afterEach(() => {
        vi.clearAllMocks();
        // Cleanup test uploads would be handled by controller, but we can verify calls
    });

    it('should accept valid PNG file', async () => {
        // Create a real small PNG file for upload
        const pngPath = path.join(testDir, 'valid.png');
        const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        fs.writeFileSync(pngPath, pngHeader);

        const response = await request(app)
            .post('/sessions/test-session/message/send/file')
            .field('to', '123@s.whatsapp.net')
            .attach('files', pngPath);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(messageQueue.add).toHaveBeenCalled();

        fs.unlinkSync(pngPath);
    });

    it('should reject file with wrong extension/content', async () => {
        // Create a "PNG" that is actually JPEG
        const fakePngPath = path.join(testDir, 'fake.png');
        const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF]);
        fs.writeFileSync(fakePngPath, jpegHeader);

        const response = await request(app)
            .post('/sessions/test-session/message/send/file')
            .field('to', '123@s.whatsapp.net')
            .attach('files', fakePngPath);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Security validation failed');
        expect(messageQueue.add).not.toHaveBeenCalled();

        // Check if file is deleted?
        // The controller deletes it.
        // But since we uploaded via supertest, the temporary file created by multer
        // in 'temp_uploads' (configured in upload.ts) should be deleted by controller.
        // We can't easily check that file existence because we don't know the random name.

        fs.unlinkSync(fakePngPath);
    });
});
