import { Request } from 'express';
import crypto from 'crypto';
import { AuditLogRepository } from '../repositories/AuditLogRepository.js';
import { logger } from './logger.js';

const auditRepo = new AuditLogRepository();
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;

export function getClientIp(req: Request): string {
    return req.ip || '';
}

export async function logAudit(
    actorType: string,
    actorId: string,
    action: string,
    req: Request,
    targetType?: string,
    targetId?: string,
    metadata?: Record<string, unknown>,
): Promise<void> {
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

export function getActorInfo(req: Request & { apiKey?: { id: string }; admin?: boolean }): { actorType: string; actorId: string } {
    if (req.apiKey) {
        return { actorType: 'api_key', actorId: req.apiKey.id };
    }
    return { actorType: 'admin', actorId: ADMIN_USERNAME || 'admin' };
}

export function hashRecipient(recipient: string): string {
    return crypto.createHash('sha256').update(recipient).digest('hex');
}
