import { Queue } from 'bullmq';
import { redisConfig } from '../config/redis.js';

const connection = {
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
};

export const messageQueue = new Queue('whatsapp-message-queue', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: 500,
        removeOnFail: 100, // Limit failed job retention for security
    },
});
