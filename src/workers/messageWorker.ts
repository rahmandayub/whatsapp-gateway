import { Worker, Job } from 'bullmq';
import { redisConfig } from '../config/redis.js';
import whatsAppService from '../services/whatsappService.js';
import pino from 'pino';
import fs from 'fs';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export const messageWorker = new Worker(
    'whatsapp-message-queue',
    async (job: Job) => {
        const type = job.name;
        const { sessionId } = job.data;
        logger.info(
            `[Job ${job.id}] Processing ${type} message for session ${sessionId}`,
        );

        try {
            switch (type) {
                case 'text':
                    const { message, to } = job.data;
                    await whatsAppService.sendTextMessage(
                        sessionId,
                        to,
                        message,
                    );
                    break;

                case 'media':
                    const { type: mediaType, mediaUrl, caption } = job.data;
                    await whatsAppService.sendMediaMessage(
                        sessionId,
                        job.data.to,
                        mediaType,
                        mediaUrl,
                        caption,
                    );
                    break;

                case 'file':
                    // Reconstruct file object roughly if needed, or pass path directly
                    // Since we can't pass Multer file object easily through Redis (buffer issue),
                    // we should pass the path and have the service read it.
                    // The controllers need to ensure the file is saved to a path accessible by worker.
                    const fileObj = {
                        path: job.data.path,
                        mimetype: job.data.mimetype,
                        originalname: job.data.originalname,
                    } as Express.Multer.File;

                    await whatsAppService.sendFileMessage(
                        sessionId,
                        job.data.to,
                        fileObj,
                        job.data.caption,
                    );

                    // Cleanup handled by service or here?
                    // Service reads it. We should probably clean up here if successful?
                    // BUT, if we fail and retry, we need the file.
                    // So we should only cleanup on completion or fatal failure.
                    // For now, let's leave cleanup to a separate mechanism or assume service handles it if transient.
                    // Actually, the original controller deleted it immediately. We need to KEEP it until job done.
                    break;

                case 'template':
                    const { templateName, variables } = job.data;
                    await whatsAppService.sendTemplateMessage(
                        sessionId,
                        job.data.to,
                        templateName,
                        variables,
                    );
                    break;

                default:
                    throw new Error(`Unknown message type: ${type}`);
            }
            logger.info(`[Job ${job.id}] Completed`);
            return { status: 'success' };
        } catch (error: any) {
            logger.error(`[Job ${job.id}] Failed: ${error.message}`);
            throw error; // Triggers retry
        }
    },
    {
        connection: redisConfig,
        concurrency: 5, // Process 5 messages in parallel globally (or per worker instance)
        limiter: {
            max: 10, // Max 10 jobs
            duration: 1000, // per 1 second
            // This global rate limit protects the WhatsApp connection from being flooded
        },
    },
);

messageWorker.on('completed', (job) => {
    // Optional: Log success or cleanup temporary files for file messages
    if (job.name === 'file' && job.data.path) {
        fs.unlink(job.data.path, () => {});
    }
});

messageWorker.on('failed', (job, err) => {
    // Verify strictly that job is not undefined
    if (
        job &&
        job.name === 'file' &&
        job.attemptsMade >= (job.opts.attempts || 3)
    ) {
        // Final failure, cleanup file
        fs.unlink(job.data.path, () => {});
    }
});
