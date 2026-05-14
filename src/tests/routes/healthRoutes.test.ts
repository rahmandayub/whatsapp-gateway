import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import healthRoutes from '../../routes/healthRoutes.js';
import pool from '../../config/database.js';
import whatsAppService from '../../services/whatsappService.js';

// Mocks
vi.mock('../../config/database.js');
vi.mock('../../services/whatsappService.js', () => ({
    default: {
        getAllSessions: vi.fn(),
    },
}));

describe('Health Routes', () => {
    let app: express.Application;

    beforeEach(() => {
        app = express();
        app.use('/', healthRoutes);
    });

    it('GET /live should return 200 OK', async () => {
        const res = await request(app).get('/live');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });

    it('GET /ready should return 200 OK when all deps are up', async () => {
        // Mock DB success
        (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({
            rows: [1],
        });

        // Mock WhatsApp Service
        (
            whatsAppService.getAllSessions as ReturnType<typeof vi.fn>
        ).mockResolvedValue([]);

        const res = await request(app).get('/ready');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(res.body.dependencies.database).toBe('up');
        expect(res.body.dependencies.redis).toBe('up');
    });

    it('GET /ready should return 503 when DB is down', async () => {
        // Mock DB failure
        (pool.query as ReturnType<typeof vi.fn>).mockRejectedValue(
            new Error('DB Down'),
        );

        (
            whatsAppService.getAllSessions as ReturnType<typeof vi.fn>
        ).mockResolvedValue([]);

        const res = await request(app).get('/ready');
        expect(res.status).toBe(503);
        expect(res.body.status).toBe('error');
        expect(res.body.dependencies.database).toBe('down');
    });
});
