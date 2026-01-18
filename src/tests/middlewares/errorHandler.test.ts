import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { errorHandler } from '../../middlewares/errorHandler.js';
import { AppError, NotFoundError } from '../../errors/AppError.js';
import { requestId } from '../../middlewares/requestId.js';

describe('Error Handling & Request ID', () => {
    let app: express.Application;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use(requestId);
    });

    it('should assign a request ID', async () => {
        app.get('/test-id', (req, res) => {
            res.json({ id: req.id });
        });

        const response = await request(app).get('/test-id');
        expect(response.status).toBe(200);
        expect(response.body.id).toBeDefined();
        expect(response.headers['x-request-id']).toBe(response.body.id);
    });

    it('should use provided request ID header', async () => {
        app.get('/test-id', (req, res) => {
            res.json({ id: req.id });
        });

        const customId = 'custom-uuid-123';
        const response = await request(app)
            .get('/test-id')
            .set('x-request-id', customId);

        expect(response.body.id).toBe(customId);
    });

    it('should handle AppError correctly', async () => {
        app.get('/error', (req, res, next) => {
            next(new AppError('Custom Error', 400, 'CUSTOM_CODE'));
        });
        app.use(errorHandler);

        const response = await request(app).get('/error');
        expect(response.status).toBe(400);
        expect(response.body).toEqual(expect.objectContaining({
            status: 'fail',
            message: 'Custom Error',
            code: 'CUSTOM_CODE'
        }));
        expect(response.body.requestId).toBeDefined();
    });

    it('should handle unexpected errors as 500', async () => {
        app.get('/unexpected', (req, res, next) => {
            next(new Error('Something went wrong'));
        });
        app.use(errorHandler);

        const response = await request(app).get('/unexpected');
        expect(response.status).toBe(500);
        expect(response.body).toEqual(expect.objectContaining({
            status: 'error',
            message: 'Internal Server Error',
            code: 'INTERNAL_SERVER_ERROR'
        }));
    });

    it('should handle NotFoundError', async () => {
        app.get('/not-found', (req, res, next) => {
            next(new NotFoundError());
        });
        app.use(errorHandler);

        const response = await request(app).get('/not-found');
        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Resource not found');
    });
});
