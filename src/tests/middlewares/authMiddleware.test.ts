import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import apiKeyAuth from '../../middlewares/authMiddleware.js';

describe('Auth Middleware', () => {
    let app: express.Application;
    const ORIGINAL_ENV = process.env;

    beforeEach(() => {
        vi.resetModules(); // Most important - resets modules
        process.env = { ...ORIGINAL_ENV }; // Reset env vars

        app = express();
        app.use(express.json());
        // We need to re-import or wrap the middleware because it might read env vars at module level
        // But the current implementation reads process.env inside the function, so it's fine.
        app.get('/test', apiKeyAuth, (req: Request, res: Response) => {
            res.status(200).json({ message: 'Success' });
        });
    });

    afterEach(() => {
        process.env = ORIGINAL_ENV;
    });

    it('should return 503 if API_KEY is not set', async () => {
        delete process.env.API_KEY;

        const response = await request(app)
            .get('/test')
            .set('x-api-key', 'some-key');

        expect(response.status).toBe(503);
        expect(response.body).toEqual({
            status: 'error',
            message: 'Service Unavailable: API configuration error',
        });
    });

    it('should return 401 if x-api-key header is missing', async () => {
        process.env.API_KEY = 'secret-key-123';

        const response = await request(app)
            .get('/test');

        expect(response.status).toBe(401);
        expect(response.body.message).toContain('Invalid or missing API Key');
    });

    it('should return 401 if x-api-key is incorrect', async () => {
        process.env.API_KEY = 'secret-key-123';

        const response = await request(app)
            .get('/test')
            .set('x-api-key', 'wrong-key');

        expect(response.status).toBe(401);
    });

    it('should return 200 if x-api-key is correct', async () => {
        process.env.API_KEY = 'secret-key-123';

        const response = await request(app)
            .get('/test')
            .set('x-api-key', 'secret-key-123');

        expect(response.status).toBe(200);
    });

    it('should reject short API keys', async () => {
        process.env.API_KEY = 'very-long-secure-key-123456';

        const response = await request(app)
            .get('/test')
            .set('x-api-key', 'short');

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Unauthorized: Invalid API Key format');
    });
});
