import './config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import sessionRoutes from './routes/sessionRoutes.js';
import templateRoutes from './routes/templateRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import metricsRoutes from './routes/metricsRoutes.js';
import docsRoutes from './routes/docsRoutes.js';
import whatsAppService from './services/whatsappService.js';
import './workers/messageWorker.js';
import './workers/webhookWorker.js';
import { CONFIG } from './config/paths.js';
import { gracefulShutdown } from './shutdown.js';
import { requestId } from './middlewares/requestId.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { logger } from './utils/logger.js';
import { metricsMiddleware } from './middlewares/metricsMiddleware.js';

if (!CONFIG.isPathSecure(CONFIG.AUTH_DIR)) {
    logger.fatal(
        'AUTH_DIR is configured inside the public directory. This is a security risk.',
    );
    process.exit(1);
}

const app = express();

// Trust proxy configuration for reverse proxy compatibility
const trustProxy = process.env.TRUST_PROXY || 'loopback';
if (trustProxy === 'true') {
    app.set('trust proxy', true);
} else if (trustProxy === 'false') {
    app.set('trust proxy', false);
} else {
    app.set('trust proxy', trustProxy);
}

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3000,
    standardHeaders: true,
    legacyHeaders: false,
});

const publicLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
});

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    'https://fonts.googleapis.com',
                ],
                fontSrc: ["'self'", 'https://fonts.gstatic.com'],
                imgSrc: ["'self'", 'data:'],
                connectSrc: ["'self'"],
            },
        },
    }),
);

const corsOrigins = process.env.CORS_ORIGINS;
if (corsOrigins) {
    const allowed = corsOrigins.split(',').map((o) => o.trim());
    app.use(cors({ origin: allowed, credentials: true }));
} else if (process.env.NODE_ENV === 'production') {
    logger.warn(
        'CORS_ORIGINS not set in production. Defaulting to same-origin.',
    );
    app.use(cors({ origin: false }));
} else {
    app.use(cors({ origin: true, credentials: true }));
}

app.use(express.json());
app.use(cookieParser());
app.use(requestId);
app.use(metricsMiddleware);

// Public Routes (with stricter rate limit)
app.use('/health', publicLimiter, healthRoutes);
app.use('/metrics', metricsRoutes);
app.use('/docs', docsRoutes);

// Admin routes (protected by adminAuth internally)
app.use('/api/v1/admin', adminRoutes);

// API Routes (protected by apiKeyAuth in route files)
app.use('/api/v1/sessions', apiLimiter, sessionRoutes);
app.use('/api/v1/templates', apiLimiter, templateRoutes);

// Global Error Handler
app.use(errorHandler);

function startServer() {
    const PORT = process.env.PORT || 3000;

    const runMigrations = () => {
        try {
            execSync('npm run migrate:up', {
                cwd: process.cwd(),
                stdio: 'inherit',
                env: process.env,
            });
            logger.info('Database migrations completed');
        } catch (error) {
            logger.error({ err: error }, 'Database migration failed');
            process.exit(1);
        }
    };

    const initDb = async () => {
        try {
            runMigrations();
        } catch (error) {
            logger.error({ err: error }, 'Failed to initialize database');
            process.exit(1);
        }
    };

    initDb().then(() => {
        whatsAppService.sessionManager.cleanupOrphanAuthDirs();
        whatsAppService.restoreSessions();
    });

    const server = app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
    });

    // Start temp file sweeper (cleans files older than 1 hour every 15 minutes)
    const tempDir = process.env.UPLOAD_DIR
        ? path.resolve(process.env.UPLOAD_DIR)
        : path.resolve(process.cwd(), 'temp_uploads');
    const SWEEP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
    const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

    function sweepTempFiles() {
        try {
            if (!fs.existsSync(tempDir)) return;
            const now = Date.now();
            const entries = fs.readdirSync(tempDir);
            let deleted = 0;
            for (const entry of entries) {
                const entryPath = path.join(tempDir, entry);
                const stat = fs.statSync(entryPath);
                if (stat.isFile() && now - stat.mtime.getTime() > MAX_AGE_MS) {
                    fs.unlinkSync(entryPath);
                    deleted++;
                }
            }
            if (deleted > 0) {
                logger.info(
                    { deleted, dir: tempDir },
                    'Temp file sweeper cleaned up old files',
                );
            }
        } catch (err) {
            logger.error({ err }, 'Temp file sweeper error');
        }
    }

    sweepTempFiles();
    const sweeperInterval = setInterval(sweepTempFiles, SWEEP_INTERVAL_MS);

    process.on('SIGTERM', () => {
        clearInterval(sweeperInterval);
        gracefulShutdown(server);
    });
    process.on('SIGINT', () => {
        clearInterval(sweeperInterval);
        gracefulShutdown(server);
    });
}

if (import.meta.url === `file://${process.argv[1]}`) {
    startServer();
}

export { app, logger, startServer };
