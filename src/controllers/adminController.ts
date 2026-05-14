import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ApiKeyRepository } from '../repositories/ApiKeyRepository.js';
import { AdminTokenRepository } from '../repositories/AdminTokenRepository.js';
import { AuditLogRepository } from '../repositories/AuditLogRepository.js';
import { SessionRepository } from '../repositories/SessionRepository.js';
import { MessageLogRepository } from '../repositories/MessageLogRepository.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../errors/AppError.js';
import { logger } from '../utils/logger.js';
import { decrypt } from '../utils/keyCrypto.js';
import { logAudit } from '../utils/audit.js';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const JWT_SECRET = process.env.JWT_SECRET;

const apiKeyRepo = new ApiKeyRepository();
const adminTokenRepo = new AdminTokenRepository();
const auditRepo = new AuditLogRepository();
const sessionRepo = new SessionRepository();
const messageLogRepo = new MessageLogRepository();

const DUMMY_HASH = bcrypt.hashSync('dummy', 10);

function timingSafeStringCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    const maxLen = Math.max(bufA.length, bufB.length);
    const paddedA = Buffer.alloc(maxLen);
    const paddedB = Buffer.alloc(maxLen);
    paddedA.set(bufA);
    paddedB.set(bufB);
    return crypto.timingSafeEqual(paddedA, paddedB);
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

    const usernameMatch = ADMIN_USERNAME
        ? timingSafeStringCompare(username, ADMIN_USERNAME)
        : false;
    if (!usernameMatch) {
        // Burn time with dummy bcrypt compare to prevent timing attacks
        bcrypt.compareSync(password, DUMMY_HASH);
        await logAudit('admin', username, 'LOGIN_FAILED', req);
        throw new AppError('Invalid credentials', 401, 'AUTH_FAILED');
    }

    if (!verifyAdminPassword(password)) {
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
            encrypted_key: string | null;
            created_at: Date;
            last_used_at: Date | null;
            revoked_at: Date | null;
            created_by: string;
        }) => {
            let key: string | null = null;
            if (k.encrypted_key) {
                try {
                    key = decrypt(k.encrypted_key);
                } catch (err) {
                    logger.error(
                        { err, keyId: k.id },
                        'Failed to decrypt API key',
                    );
                }
            }
            return {
                id: k.id,
                name: k.name,
                prefix: k.prefix,
                key,
                created_at: k.created_at,
                last_used_at: k.last_used_at,
                revoked_at: k.revoked_at,
                created_by: k.created_by,
            };
        },
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

        await apiKeyRepo.rotate(id, prefix, fullKey, hash);

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
            Math.max(
                Number.isFinite(Number(req.query.limit))
                    ? Number(req.query.limit)
                    : 100,
                1,
            ),
            500,
        );
        const offset = Math.max(
            Number.isFinite(Number(req.query.offset))
                ? Number(req.query.offset)
                : 0,
            0,
        );
        const logs = await auditRepo.findRecent(limit, offset);
        res.json({ status: 'success', logs });
    },
);

export const listMessageLogs = asyncHandler(
    async (req: Request, res: Response) => {
        const limit = Math.min(
            Math.max(
                Number.isFinite(Number(req.query.limit))
                    ? Number(req.query.limit)
                    : 100,
                1,
            ),
            500,
        );
        const offset = Math.max(
            Number.isFinite(Number(req.query.offset))
                ? Number(req.query.offset)
                : 0,
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

export const listAdminTokens = asyncHandler(
    async (req: Request, res: Response) => {
        const tokens = await adminTokenRepo.findAll();
        const sanitized = tokens.map((t) => ({
            id: t.id,
            name: t.name,
            prefix: t.prefix,
            created_at: t.created_at,
            last_used_at: t.last_used_at,
            revoked_at: t.revoked_at,
            expires_at: t.expires_at,
            created_by: t.created_by,
        }));
        res.json({ status: 'success', adminTokens: sanitized });
    },
);

export const createAdminToken = asyncHandler(
    async (req: Request, res: Response) => {
        const { name, expiresAt } = req.body;
        if (!name || typeof name !== 'string') {
            throw new AppError('Name is required', 400, 'VALIDATION_ERROR');
        }

        const rawKey = crypto.randomBytes(32).toString('hex');
        const prefix = 'wak_adm_' + crypto.randomBytes(4).toString('hex');
        const fullKey = `${prefix}.${rawKey}`;
        const hash = crypto.createHash('sha256').update(fullKey).digest('hex');

        let parsedExpiresAt: Date | null = null;
        if (expiresAt) {
            const parsed = new Date(expiresAt);
            if (isNaN(parsed.getTime())) {
                throw new AppError(
                    'Invalid expiresAt',
                    400,
                    'VALIDATION_ERROR',
                );
            }
            parsedExpiresAt = parsed;
        }

        const id = await adminTokenRepo.create({
            name: name.trim(),
            prefix,
            keyHash: hash,
            createdBy: ADMIN_USERNAME || 'admin',
            expiresAt: parsedExpiresAt,
        });

        await logAudit(
            'admin',
            ADMIN_USERNAME || 'admin',
            'ADMIN_TOKEN_CREATED',
            req,
            'admin_token',
            id,
        );

        res.json({
            status: 'success',
            adminToken: {
                id,
                name: name.trim(),
                prefix,
                token: fullKey,
            },
        });
    },
);

export const regenerateAdminToken = asyncHandler(
    async (req: Request, res: Response) => {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const existing = await adminTokenRepo.findById(id);
        if (!existing) {
            throw new AppError('Admin token not found', 404, 'NOT_FOUND');
        }

        const rawKey = crypto.randomBytes(32).toString('hex');
        const prefix = 'wak_adm_' + crypto.randomBytes(4).toString('hex');
        const fullKey = `${prefix}.${rawKey}`;
        const hash = crypto.createHash('sha256').update(fullKey).digest('hex');

        await adminTokenRepo.rotate(id, prefix, hash);

        await logAudit(
            'admin',
            ADMIN_USERNAME || 'admin',
            'ADMIN_TOKEN_REGENERATED',
            req,
            'admin_token',
            id,
        );

        res.json({
            status: 'success',
            adminToken: {
                id,
                name: existing.name,
                prefix,
                token: fullKey,
            },
        });
    },
);

export const revokeAdminToken = asyncHandler(
    async (req: Request & { adminToken?: { id: string } }, res: Response) => {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        if (req.adminToken && req.adminToken.id === id) {
            throw new AppError(
                'Cannot revoke the admin token you are currently using',
                400,
                'VALIDATION_ERROR',
            );
        }

        await adminTokenRepo.revoke(id);
        await logAudit(
            'admin',
            ADMIN_USERNAME || 'admin',
            'ADMIN_TOKEN_REVOKED',
            req,
            'admin_token',
            id,
        );
        res.json({ status: 'success', message: 'Admin token revoked' });
    },
);

export const deleteAdminToken = asyncHandler(
    async (req: Request & { adminToken?: { id: string } }, res: Response) => {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        if (req.adminToken && req.adminToken.id === id) {
            throw new AppError(
                'Cannot delete the admin token you are currently using',
                400,
                'VALIDATION_ERROR',
            );
        }

        await adminTokenRepo.delete(id);
        await logAudit(
            'admin',
            ADMIN_USERNAME || 'admin',
            'ADMIN_TOKEN_DELETED',
            req,
            'admin_token',
            id,
        );
        res.json({ status: 'success', message: 'Admin token deleted' });
    },
);
