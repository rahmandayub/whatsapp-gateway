import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ApiKeyRepository } from '../repositories/ApiKeyRepository.js';
import { AdminTokenRepository } from '../repositories/AdminTokenRepository.js';
import { logger } from '../utils/logger.js';

export interface CombinedAuthRequest extends Request {
    apiKey?: { id: string; prefix: string; name: string };
    admin?: boolean;
    adminToken?: { id: string; name: string };
}

const apiKeyRepo = new ApiKeyRepository();
const adminTokenRepo = new AdminTokenRepository();
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;

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

    // Try admin bearer token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const bearerToken = authHeader.slice(7);
        if (bearerToken && bearerToken.length >= 10) {
            try {
                const hash = crypto
                    .createHash('sha256')
                    .update(bearerToken)
                    .digest('hex');
                const record = await adminTokenRepo.findByHash(hash);
                if (
                    record &&
                    !record.revoked_at &&
                    (!record.expires_at ||
                        new Date(record.expires_at) > new Date())
                ) {
                    req.admin = true;
                    req.adminToken = {
                        id: record.id,
                        name: record.name,
                    };
                    adminTokenRepo.updateLastUsedAt(record.id).catch(() => {});
                    return next();
                }
            } catch (err) {
                logger.error({ err }, 'Admin token auth lookup failed');
            }
        }
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
