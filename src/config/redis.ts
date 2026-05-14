import './env.js';
import { createClient } from 'redis';
import pino from 'pino';
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
};

function buildRedisUrl(): string {
    const { host, port, password } = redisConfig;
    if (password) {
        const encoded = encodeURIComponent(password);
        return `redis://:${encoded}@${host}:${port}`;
    }
    return `redis://${host}:${port}`;
}

const redisClient = createClient({
    url: buildRedisUrl(),
});

redisClient.on('error', (err) => logger.error({ err }, 'Redis Client Error'));
redisClient.on('connect', () => logger.info('Redis Client Connected'));

// We don't necessarily need to connect this client immediately if we just use it for config export
// But if other parts use it, we should. For now, we export the config for BullMQ.
export { redisConfig };
export default redisClient;
