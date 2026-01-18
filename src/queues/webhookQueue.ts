import { Queue } from 'bullmq';

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

export const webhookQueue = new Queue('webhookQueue', {
    connection,
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 1000, // Initial delay 1s, then 2s, 4s, 8s, 16s
        },
        removeOnComplete: true, // Keep history manageable
        removeOnFail: false, // Keep failed jobs for inspection/dead letter
    },
});
