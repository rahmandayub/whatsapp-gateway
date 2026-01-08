import { Queue } from 'bullmq';
import { redisConfig } from '../config/redis.js';

export const messageQueue = new Queue('whatsapp-message-queue', {
    connection: redisConfig,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: 1000, // Keep last 1000 completed jobs
        removeOnFail: 5000, // Keep last 5000 failed jobs for debugging
    },
});
