import { Worker, Job } from 'bullmq';
import { logger } from '../utils/logger.js';

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

interface WebhookJobData {
    url: string;
    event: string;
    data: any;
    timestamp: number;
    sessionId?: string;
    requestId?: string; // Track request ID if available
}

export const webhookWorker = new Worker<WebhookJobData>(
    'webhookQueue',
    async (job: Job<WebhookJobData>) => {
        const { url, event, data, timestamp, sessionId, requestId } = job.data;
        const logContext = { jobId: job.id, sessionId, event, url, requestId };

        logger.info(logContext, 'Processing webhook');

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'WhatsApp-Gateway/1.0',
                    ...(requestId && { 'X-Request-ID': requestId }),
                },
                body: JSON.stringify({
                    event,
                    ...data,
                    timestamp,
                }),
            });

            if (!response.ok) {
                // If 5xx or 429, throw error to trigger retry.
                // If 4xx (except 429), maybe don't retry?
                // For now, let's retry on all non-2xx to ensure delivery if possible, or fail eventually.
                const responseBody = await response.text().catch(() => 'No body');
                throw new Error(`Webhook failed with status ${response.status}: ${responseBody}`);
            }

            logger.info(logContext, 'Webhook sent successfully');
        } catch (error: any) {
            logger.error({ ...logContext, err: error }, 'Webhook delivery failed');
            throw error; // Triggers BullMQ retry
        }
    },
    {
        connection,
        concurrency: 10, // Adjust based on load
        limiter: {
            max: 50, // Max 50 webhooks per second (global for this worker)
            duration: 1000
        }
    },
);

webhookWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Webhook job failed permanently (or after attempt)');
});

webhookWorker.on('error', (err) => {
    logger.error({ err }, 'Webhook worker error');
});
