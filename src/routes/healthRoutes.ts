import express, { Request, Response } from 'express';
import pool from '../config/database.js';
import { webhookQueue } from '../queues/webhookQueue.js';
import whatsAppService from '../services/whatsappService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// Liveness probe - simple 200 OK if server is running
router.get('/live', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Readiness probe - checks dependencies
router.get('/ready', asyncHandler(async (req: Request, res: Response) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        dependencies: {
            database: 'unknown',
            redis: 'unknown',
        },
        system: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
        },
        sessions: {
            active: 0,
            total: 0
        }
    };

    let isHealthy = true;

    // Check Database
    try {
        await pool.query('SELECT 1');
        health.dependencies.database = 'up';
    } catch (err: any) {
        health.dependencies.database = 'down';
        isHealthy = false;
    }

    // Check Redis (via BullMQ)
    try {
        const client = await webhookQueue.client;
        await client.ping();
        health.dependencies.redis = 'up';
    } catch (err: any) {
        health.dependencies.redis = 'down';
        isHealthy = false;
    }

    // Session Stats
    try {
        const allSessions = await whatsAppService.getAllSessions();
        health.sessions.total = allSessions.length;
        health.sessions.active = allSessions.filter(s => s.status === 'CONNECTED').length;
    } catch (err) {
        // Non-critical for readiness? Maybe critical for business logic.
        // Let's assume if DB is up, this works, else it failed above.
    }

    if (!isHealthy) {
        health.status = 'error';
        return res.status(503).json(health);
    }

    res.status(200).json(health);
}));

export default router;
