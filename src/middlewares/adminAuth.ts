import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { AdminTokenRepository } from '../repositories/AdminTokenRepository.js';
import { logger } from '../utils/logger.js';

export interface AuthenticatedAdminRequest extends Request {
    admin?: boolean;
    adminToken?: { id: string; name: string };
}

const adminTokenRepo = new AdminTokenRepository();
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;

async function adminAuth(
    req: AuthenticatedAdminRequest,
    res: Response,
    next: NextFunction,
) {
    // Allow via admin bearer token
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
                if (record) {
                    if (
                        !record.revoked_at &&
                        (!record.expires_at ||
                            new Date(record.expires_at) > new Date())
                    ) {
                        req.admin = true;
                        req.adminToken = {
                            id: record.id,
                            name: record.name,
                        };
                        adminTokenRepo
                            .updateLastUsedAt(record.id)
                            .catch(() => {});
                        return next();
                    }
                }
            } catch (err) {
                logger.error({ err }, 'Admin token auth lookup failed');
            }
        }
    }

    // Allow via JWT cookie
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
            return res
                .status(403)
                .json({ status: 'error', message: 'Forbidden' });
        } catch {
            return res
                .status(401)
                .json({ status: 'error', message: 'Unauthorized' });
        }
    }

    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
}

export { adminAuth };
