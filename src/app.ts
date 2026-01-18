import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import pool from './config/database.js';
import sessionRoutes from './routes/sessionRoutes.js';
import templateRoutes from './routes/templateRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import metricsRoutes from './routes/metricsRoutes.js';
import docsRoutes from './routes/docsRoutes.js';
import apiKeyAuth from './middlewares/authMiddleware.js';
import whatsAppService from './services/whatsappService.js';
import './workers/messageWorker.js'; // Initialize message worker
import './workers/webhookWorker.js'; // Initialize webhook worker
import { CONFIG } from './config/paths.js';
import { gracefulShutdown } from './shutdown.js';
import { requestId } from './middlewares/requestId.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { logger } from './utils/logger.js';
import { metricsMiddleware } from './middlewares/metricsMiddleware.js';

dotenv.config();

// Task 1.2.4: Validate auth directory is not under public/
if (!CONFIG.isPathSecure(CONFIG.AUTH_DIR)) {
    console.error('FATAL: AUTH_DIR is configured inside the public directory. This is a security risk.');
    process.exit(1);
}

const app = express();

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3000, // limit each IP to 3000 requests per windowMs (allows ~3 req/sec avg)
});

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "'unsafe-eval'", // Alpine.js might need this
                    'https://cdn.tailwindcss.com',
                    'https://cdn.jsdelivr.net',
                ],
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'", // Tailwind adds inline styles
                    'https://fonts.googleapis.com',
                ],
                fontSrc: ["'self'", 'https://fonts.gstatic.com'],
                imgSrc: ["'self'", 'data:', 'https://api.qrserver.com'], // QR codes from api.qrserver.com
                connectSrc: ["'self'"],
            },
        },
    }),
);
app.use(cors());
app.use(express.json());
app.use(requestId); // Add Request ID middleware
app.use(metricsMiddleware); // Add Prometheus metrics
app.use(limiter);

// Serve static files for Admin Panel
// 'import.meta.url' logic to get __dirname equivalent in ESM if needed, but relative path often works.
// Using process.cwd() is safer for project root relative paths.
const publicPath = path.join(process.cwd(), 'src', 'public');
app.use('/admin', express.static(publicPath));
app.use(express.static(publicPath));

// Public Routes
app.use('/health', healthRoutes);
app.use('/metrics', metricsRoutes);
app.use('/docs', docsRoutes);

// API Routes (Protected)
app.use('/api/v1', apiKeyAuth); // Apply auth middleware to all /api/v1 routes
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/templates', templateRoutes);

// Global Error Handler
app.use(errorHandler);

// Only listen if executed directly, not when imported
// @ts-ignore
if (import.meta.url === `file://${process.argv[1]}`) {
    const PORT = process.env.PORT || 3000;

    const initDb = async () => {
        try {
            const schemaPath = path.join(
                process.cwd(),
                'src',
                'database',
                'init_schema.sql',
            );
            const schema = fs.readFileSync(schemaPath, 'utf8');
            await pool.query(schema);
            logger.info('Database schema initialized');
        } catch (error) {
            logger.error(
                { err: error },
                'Failed to initialize database schema',
            );
        }
    };

    initDb().then(() => {
        whatsAppService.restoreSessions();
    });

    const server = app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
    });

    // Graceful Shutdown
    process.on('SIGTERM', () => gracefulShutdown(server));
    process.on('SIGINT', () => gracefulShutdown(server));
}

export { app, logger };
