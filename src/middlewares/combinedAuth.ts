import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { ApiKeyRepository } from '../repositories/ApiKeyRepository.js';
import { logger } from '../utils/logger.js';

export interface CombinedAuthRequest extends Request {
    apiKey?: { id: string; prefix: string; name: string };
    admin?: boolean;
}

const apiKeyRepo = new ApiKeyRepository();
const MASTER_API_KEY_HASH = process.env.MASTER_API_KEY_HASH;
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;

function verifyMasterKey(key: string): boolean {
    if (!key || key.length < 10) return false;
    if (MASTER_API_KEY_HASH) {
        return bcrypt.compareSync(key, MASTER_API_KEY_HASH);
    }
    return false;
}

export async function combinedAuth(
    req: CombinedAuthRequest,
    res: Response,
    next: NextFunction,
) {
    // Try API key first
    const apiKeyHeader = req.headers['x-api-key'] as string;
    if (apiKeyHeader && apiKeyHeader.length >= 10) {
        try {
            const hash = crypto
                .createHash('sha256')
                .update(apiKeyHeader)
                .digest('hex');
            const record = await apiKeyRepo.findByHash(hash);
            if (record && !record.revoked_at) {
                req.apiKey = {
                    id: record.id,
                    prefix: record.prefix,
                    name: record.name,
                };
                apiKeyRepo.updateLastUsedAt(record.id).catch(() => {});
                return next();
            }
        } catch (err) {
            logger.error({ err }, 'API key auth lookup failed');
        }
    }

    // Try admin key header
    const adminKey = req.headers['x-admin-key'] as string;
    if (adminKey && verifyMasterKey(adminKey)) {
        req.admin = true;
        return next();
    }

    // Try JWT cookie
    const token = req.cookies?.admin_token;
    if (token && JWT_SECRET) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as {
                sub: string;
                role: string;
            };
            if (decoded.role === 'admin' && decoded.sub === ADMIN_USERNAME) {
                req.admin = true;
                return next();
            }
        } catch {
            // invalid token
        }
    }

    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
}
