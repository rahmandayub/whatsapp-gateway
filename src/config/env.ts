import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

// Docker Compose .env parser uses $$ for literal $.
// Unescape $$ -> $ so Node.js gets the correct values.
for (const [key, value] of Object.entries(process.env)) {
    if (value && value.includes('$$')) {
        process.env[key] = value.replace(/\$\$/g, '$');
    }
}

function validateEnv(): void {
    const errors: string[] = [];

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.length < 32) {
        errors.push('JWT_SECRET must be at least 32 characters long');
    }

    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    if (!adminPasswordHash || adminPasswordHash.length === 0) {
        errors.push('ADMIN_PASSWORD_HASH is required');
    }

    const keyEncryptionSecret = process.env.KEY_ENCRYPTION_SECRET;
    if (!keyEncryptionSecret || !/^[a-f0-9]{64}$/i.test(keyEncryptionSecret)) {
        errors.push(
            'KEY_ENCRYPTION_SECRET must be a 64-character hex string (32 bytes)',
        );
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl || databaseUrl.length === 0) {
        errors.push('DATABASE_URL is required');
    }

    const masterApiKeyHash = process.env.MASTER_API_KEY_HASH;
    if (!masterApiKeyHash || masterApiKeyHash.length === 0) {
        errors.push(
            'MASTER_API_KEY_HASH is required (plaintext MASTER_API_KEY is no longer supported)',
        );
    }

    if (errors.length > 0) {
        const message =
            'Environment validation failed:\n  - ' + errors.join('\n  - ');
        if (process.env.NODE_ENV === 'production') {
            logger.fatal(message);
            process.exit(1);
        } else {
            logger.warn(message);
        }
    }
}

validateEnv();
