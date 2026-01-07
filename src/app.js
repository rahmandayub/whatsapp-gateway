import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import pino from 'pino';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import pool from './config/database.js';
import sessionRoutes from './routes/sessionRoutes.js';
import apiKeyAuth from './middlewares/authMiddleware.js';
import whatsAppService from './services/whatsappService.js';

dotenv.config();

const app = express();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
});

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(limiter);
app.use(apiKeyAuth);

app.use('/api/v1/sessions', sessionRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Only listen if executed directly, not when imported
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
            logger.error('Failed to initialize database schema:', error);
        }
    };

    initDb().then(() => {
        whatsAppService.restoreSessions();
    });

    app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
    });
}

export { app, logger };
