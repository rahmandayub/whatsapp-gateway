import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ApiKeyRepository } from '../repositories/ApiKeyRepository.js';
import { AuditLogRepository } from '../repositories/AuditLogRepository.js';
import { SessionRepository } from '../repositories/SessionRepository.js';
import { MessageLogRepository } from '../repositories/MessageLogRepository.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../errors/AppError.js';
import { logger } from '../utils/logger.js';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const JWT_SECRET = process.env.JWT_SECRET;

const apiKeyRepo = new ApiKeyRepository();
const auditRepo = new AuditLogRepository();
const sessionRepo = new SessionRepository();
const messageLogRepo = new MessageLogRepository();

function getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    if (Array.isArray(forwarded)) return forwarded[0].trim();
    return req.ip || '';
}

async function logAudit(
    actorType: string,
    actorId: string,
    action: string,
    req: Request,
    targetType?: string,
    targetId?: string,
    metadata?: Record<string, unknown>,
) {
    try {
        await auditRepo.create({
            actorType,
            actorId,
            action,
            targetType: targetType ?? null,
            targetId: targetId ?? null,
            ip: getClientIp(req),
            requestId: (req as unknown as { requestId?: string }).requestId,
            metadata: metadata ?? null,
        });
    } catch (err) {
        logger.error({ err }, 'Failed to write audit log');
    }
}

function verifyAdminPassword(password: string): boolean {
    if (!password) return false;
    if (ADMIN_PASSWORD_HASH) {
        return bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);
    }
    return false;
}

export const adminLogin = asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
        throw new AppError(
            'Username and password required',
            400,
            'VALIDATION_ERROR',
        );
    }

    if (username !== ADMIN_USERNAME || !verifyAdminPassword(password)) {
        await logAudit('admin', username, 'LOGIN_FAILED', req);
        throw new AppError('Invalid credentials', 401, 'AUTH_FAILED');
    }

    if (!JWT_SECRET) {
        throw new AppError('Server misconfiguration', 500, 'CONFIG_ERROR');
    }

    const token = jwt.sign(
        { sub: ADMIN_USERNAME!, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '8h', issuer: 'whatsapp-gateway' },
    );

    res.cookie('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

    await logAudit('admin', ADMIN_USERNAME || 'admin', 'LOGIN_SUCCESS', req);

    res.json({ status: 'success', message: 'Login successful' });
});

export const adminLogout = asyncHandler(async (req: Request, res: Response) => {
    res.clearCookie('admin_token');
    await logAudit('admin', ADMIN_USERNAME || 'unknown', 'LOGOUT', req);
    res.json({ status: 'success', message: 'Logged out' });
});

export const adminMe = asyncHandler(async (req: Request, res: Response) => {
    res.json({
        status: 'success',
        admin: { username: ADMIN_USERNAME },
    });
});

export const listApiKeys = asyncHandler(async (req: Request, res: Response) => {
    const keys = await apiKeyRepo.findAll();
    const sanitized = keys.map(
        (k: {
            id: string;
            name: string;
            prefix: string;
            full_key: string | null;
            created_at: Date;
            last_used_at: Date | null;
            revoked_at: Date | null;
            created_by: string;
        }) => ({
            id: k.id,
            name: k.name,
            prefix: k.prefix,
            key: k.full_key,
            created_at: k.created_at,
            last_used_at: k.last_used_at,
            revoked_at: k.revoked_at,
            created_by: k.created_by,
        }),
    );
    res.json({ status: 'success', apiKeys: sanitized });
});

export const createApiKey = asyncHandler(
    async (req: Request, res: Response) => {
        const { name } = req.body;
        if (!name || typeof name !== 'string') {
            throw new AppError('Name is required', 400, 'VALIDATION_ERROR');
        }

        const rawKey = crypto.randomBytes(32).toString('hex');
        const prefix = 'wak_' + crypto.randomBytes(4).toString('hex');
        const fullKey = `${prefix}.${rawKey}`;
        const hash = crypto.createHash('sha256').update(fullKey).digest('hex');

        const id = await apiKeyRepo.create({
            name: name.trim(),
            prefix,
            keyHash: hash,
            fullKey,
            createdBy: 'admin',
        });

        await logAudit(
            'admin',
            ADMIN_USERNAME || 'admin',
            'API_KEY_CREATED',
            req,
            'api_key',
            id,
        );

        res.json({
            status: 'success',
            apiKey: {
                id,
                name: name.trim(),
                prefix,
                key: fullKey,
            },
        });
    },
);

export const revokeApiKey = asyncHandler(
    async (req: Request, res: Response) => {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
        await apiKeyRepo.revoke(id);
        await logAudit(
            'admin',
            ADMIN_USERNAME || 'admin',
            'API_KEY_REVOKED',
            req,
            'api_key',
            id,
        );
        res.json({ status: 'success', message: 'API key revoked' });
    },
);

export const deleteApiKey = asyncHandler(
    async (req: Request, res: Response) => {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
        await apiKeyRepo.delete(id);
        await logAudit(
            'admin',
            ADMIN_USERNAME || 'admin',
            'API_KEY_DELETED',
            req,
            'api_key',
            id,
        );
        res.json({ status: 'success', message: 'API key deleted' });
    },
);

export const regenerateApiKey = asyncHandler(
    async (req: Request, res: Response) => {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const existing = await apiKeyRepo.findById(id);
        if (!existing) {
            throw new AppError('API key not found', 404, 'NOT_FOUND');
        }

        const rawKey = crypto.randomBytes(32).toString('hex');
        const prefix = 'wak_' + crypto.randomBytes(4).toString('hex');
        const fullKey = `${prefix}.${rawKey}`;
        const hash = crypto.createHash('sha256').update(fullKey).digest('hex');

        await apiKeyRepo.updateFullKey(id, fullKey, hash);

        await logAudit(
            'admin',
            ADMIN_USERNAME || 'admin',
            'API_KEY_REGENERATED',
            req,
            'api_key',
            id,
        );

        res.json({
            status: 'success',
            apiKey: {
                id,
                name: existing.name,
                prefix,
                key: fullKey,
            },
        });
    },
);

export const getApiKeySessions = asyncHandler(
    async (req: Request, res: Response) => {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
        const sessions = await sessionRepo.findByApiKey(id);
        res.json({ status: 'success', sessions });
    },
);

export const listAuditLogs = asyncHandler(
    async (req: Request, res: Response) => {
        const limit = Math.min(
            parseInt((req.query.limit as string) || '100', 10),
            500,
        );
        const offset = Math.max(
            parseInt((req.query.offset as string) || '0', 10),
            0,
        );
        const logs = await auditRepo.findRecent(limit, offset);
        res.json({ status: 'success', logs });
    },
);

export const listMessageLogs = asyncHandler(
    async (req: Request, res: Response) => {
        const limit = Math.min(
            parseInt((req.query.limit as string) || '100', 10),
            500,
        );
        const offset = Math.max(
            parseInt((req.query.offset as string) || '0', 10),
            0,
        );
        const logs = await messageLogRepo.findAll(limit, offset);
        const transformedLogs = logs.map(
            (log: {
                id?: number;
                timestamp?: Date;
                direction: string;
                recipient?: string;
                session_id?: string;
                content_preview?: string;
                message_type?: string;
            }) => ({
                id: String(log.id),
                timestamp:
                    log.timestamp?.toISOString() || new Date().toISOString(),
                direction: log.direction,
                from: log.direction === 'incoming' ? log.recipient : undefined,
                to: log.direction === 'outgoing' ? log.recipient : undefined,
                sessionId: log.session_id,
                text: log.content_preview || '',
                type: log.message_type,
            }),
        );
        res.json({ status: 'success', logs: transformedLogs });
    },
);
