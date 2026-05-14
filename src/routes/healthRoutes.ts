import express, { Request } from 'express';
import pool from '../config/database.js';
import { webhookQueue } from '../queues/webhookQueue.js';
import whatsAppService from '../services/whatsappService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

interface HealthAuthRequest extends Request {
    admin?: boolean;
    apiKey?: { id: string; prefix: string; name: string };
}

const router = express.Router();

// Liveness probe - simple 200 OK if server is running
router.get('/live', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Readiness probe - checks dependencies
router.get(
    '/ready',
    asyncHandler(async (req: HealthAuthRequest, res, _next) => {
        const isAuthenticated = !!(req.admin || req.apiKey);

        const health: Record<string, unknown> = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            dependencies: {
                database: 'unknown',
                redis: 'unknown',
            },
        };

        let isHealthy = true;

        // Check Database
        try {
            await pool.query('SELECT 1');
            health.dependencies = {
                ...(health.dependencies as object),
                database: 'up',
            };
        } catch {
            health.dependencies = {
                ...(health.dependencies as object),
                database: 'down',
            };
            isHealthy = false;
        }

        // Check Redis (via BullMQ)
        try {
            const client = await webhookQueue.client;
            await client.ping();
            health.dependencies = {
                ...(health.dependencies as object),
                redis: 'up',
            };
        } catch {
            health.dependencies = {
                ...(health.dependencies as object),
                redis: 'down',
            };
            isHealthy = false;
        }

        // Only expose system and session details to authenticated requests
        if (isAuthenticated) {
            health.system = {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
            };

            const sessions = { active: 0, total: 0 };
            try {
                const allSessions = await whatsAppService.getAllSessions();
                sessions.total = allSessions.length;
                sessions.active = allSessions.filter(
                    (s) => s.status === 'CONNECTED',
                ).length;
            } catch {
                // Non-critical
            }
            health.sessions = sessions;
        }

        if (!isHealthy) {
            health.status = 'error';
            return res.status(503).json(health);
        }

        res.status(200).json(health);
    }),
);

export default router;
