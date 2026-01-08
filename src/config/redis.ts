import { createClient } from 'redis';
import dotenv from 'dotenv';
import pino from 'pino';

dotenv.config();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
};

const redisClient = createClient({
    url: `redis://${redisConfig.password ? `:${redisConfig.password}@` : ''}${redisConfig.host}:${redisConfig.port}`,
});

redisClient.on('error', (err: any) => logger.error('Redis Client Error', err));
redisClient.on('connect', () => logger.info('Redis Client Connected'));

// We don't necessarily need to connect this client immediately if we just use it for config export
// But if other parts use it, we should. For now, we export the config for BullMQ.
export { redisConfig };
export default redisClient;
