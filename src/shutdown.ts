import { Server } from 'http';
import pool from './config/database.js';
import whatsAppService from './services/whatsappService.js';
import { messageQueue } from './queues/messageQueue.js';
import { webhookQueue } from './queues/webhookQueue.js';
import { logger } from './utils/logger.js';

export const gracefulShutdown = async (server: Server) => {
    logger.info('Received kill signal, shutting down gracefully');

    // Force exit if shutdown takes too long (30s)
    setTimeout(() => {
        logger.error(
            'Could not close connections in time, forcefully shutting down',
        );
        process.exit(1);
    }, 30000);

    try {
        // 1. Stop accepting new HTTP requests
        server.close(() => {
            logger.info('Closed out remaining connections');
        });

        // 2. Stop WhatsApp sessions
        const sessions = await whatsAppService.getAllSessions();
        logger.info(`Stopping ${sessions.length} active sessions...`);
        for (const session of sessions) {
            // We use stopSession to disconnect but preserve state
            await whatsAppService.stopSession(
                session.sessionId,
                'DISCONNECTED',
            );
        }

        // 3. Pause/Close BullMQ
        logger.info('Closing queues...');
        await messageQueue.close();
        await webhookQueue.close();

        // 4. Close Database Pool
        logger.info('Closing database connection...');
        await pool.end();

        logger.info('Graceful shutdown complete');
        process.exit(0);
    } catch (error) {
        logger.error({ err: error }, 'Error during graceful shutdown');
        process.exit(1);
    }
};
