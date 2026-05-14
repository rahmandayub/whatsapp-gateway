import './env.js';
import pg from 'pg';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    idleTimeoutMillis: parseInt(
        process.env.DB_POOL_IDLE_TIMEOUT || '30000',
        10,
    ),
    connectionTimeoutMillis: parseInt(
        process.env.DB_POOL_CONNECTION_TIMEOUT || '2000',
        10,
    ),
});

pool.on('error', (err, _client) => {
    logger.error({ err }, 'Unexpected error on idle client');
});

pool.on('connect', (_client) => {
    // logger.debug('New database connection established');
});

export default pool;
