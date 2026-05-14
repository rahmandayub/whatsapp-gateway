import { Worker, Job } from 'bullmq';
import { logger } from '../utils/logger.js';
import { WebhookJobData } from '../types/webhook.types.js';
import crypto from 'crypto';
import dns from 'dns';
import util from 'util';
import { URL } from 'url';
import { isPrivateIp } from '../utils/urlValidator.js';

const lookup = util.promisify(dns.lookup);

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
};

const WEBHOOK_SIGNING_SECRET = process.env.WEBHOOK_SIGNING_SECRET;
const WEBHOOK_ALLOW_HTTP = process.env.WEBHOOK_ALLOW_HTTP === 'true';

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

        // Block HTTP unless explicitly allowed
        if (url.startsWith('http://') && !WEBHOOK_ALLOW_HTTP) {
            logger.warn(
                { url },
                'Blocked HTTP webhook (WEBHOOK_ALLOW_HTTP=false)',
            );
            return; // Do not retry
        }

        // SSRF defense: resolve hostname at connect-time to prevent DNS rebinding
        let resolvedUrl: string;
        try {
            const parsed = new URL(url);
            const { address } = await lookup(parsed.hostname);
            if (isPrivateIp(address)) {
                logger.warn(
                    { url, resolvedIp: address },
                    'Blocked webhook to private IP',
                );
                return; // Do not retry
            }
            // Replace hostname with resolved IP but keep original Host header
            parsed.hostname = address;
            resolvedUrl = parsed.toString();
        } catch {
            logger.warn({ url }, 'Webhook DNS resolution failed');
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

            const response = await fetch(resolvedUrl, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'WhatsApp-Gateway/1.0',
                    Host: new URL(url).hostname,
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
