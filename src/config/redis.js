import { createClient } from 'redis';
import dotenv from 'dotenv';
import pino from 'pino';

dotenv.config();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('connect', () => logger.info('Redis Client Connected'));

export default redisClient;
