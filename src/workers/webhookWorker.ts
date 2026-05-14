import { Worker, Job } from 'bullmq';
import { logger } from '../utils/logger.js';
import { WebhookJobData } from '../types/webhook.types.js';
import crypto from 'crypto';

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
};

const WEBHOOK_SIGNING_SECRET = process.env.WEBHOOK_SIGNING_SECRET;

function signPayload(payload: string): string | undefined {
    if (!WEBHOOK_SIGNING_SECRET) return undefined;
    return crypto
        .createHmac('sha256', WEBHOOK_SIGNING_SECRET)
        .update(payload)
        .digest('hex');
}

export const webhookWorker = new Worker<WebhookJobData>(
    'webhookQueue',
    async (job: Job<WebhookJobData>) => {
        const { url, event, data, timestamp, sessionId, requestId } = job.data;
        const logContext = { jobId: job.id, sessionId, event, url, requestId };

        logger.info(logContext, 'Processing webhook');

        // Enforce HTTPS in production
        if (
            process.env.NODE_ENV === 'production' &&
            !url.startsWith('https://')
        ) {
            logger.warn({ url }, 'Blocked HTTP webhook in production');
            return; // Do not retry
        }

        try {
            const payload = JSON.stringify({
                event,
                ...(data as Record<string, unknown>),
                timestamp,
            });

            const signature = signPayload(payload);

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

            const response = await fetch(url, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'WhatsApp-Gateway/1.0',
                    ...(requestId && { 'X-Request-ID': requestId }),
                    ...(signature && {
                        'X-Webhook-Signature': `sha256=${signature}`,
                    }),
                },
                body: payload,
            });

            clearTimeout(timeout);

            if (!response.ok) {
                const responseBody = await response
                    .text()
                    .catch(() => 'No body');
                throw new Error(
                    `Webhook failed with status ${response.status}: ${responseBody}`,
                );
            }

            logger.info(logContext, 'Webhook sent successfully');
        } catch (error: unknown) {
            logger.error(
                { ...logContext, err: error },
                'Webhook delivery failed',
            );
            throw error;
        }
    },
    {
        connection,
        concurrency: 10,
        limiter: {
            max: 50,
            duration: 1000,
        },
    },
);

webhookWorker.on('failed', (job, err) => {
    logger.error(
        { jobId: job?.id, err },
        'Webhook job failed permanently (or after attempt)',
    );
});

webhookWorker.on('error', (err) => {
    logger.error({ err }, 'Webhook worker error');
});
