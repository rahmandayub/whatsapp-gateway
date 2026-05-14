import { Request, Response } from 'express';
import whatsAppService from '../services/whatsappService.js';
import { messageQueue } from '../queues/messageQueue.js';
import QRCode from 'qrcode';
import fs from 'fs';
import { validateFileSignature } from '../utils/fileValidation.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
    AppError,
    NotFoundError,
    ValidationError,
} from '../errors/AppError.js';

// Extend Request type for apiKey
interface ApiKeyRequest extends Request {
    apiKey?: { id: string; prefix: string; name: string };
    admin?: boolean;
}

function safeSessionId(req: Request): string {
    const sid = req.params.sessionId;
    return Array.isArray(sid) ? sid[0] : sid;
}

export const startSession = asyncHandler(
    async (req: ApiKeyRequest, res: Response) => {
        const {
            name,
            sessionId: providedSessionId,
            webhookUrl,
            apiKeyId: providedApiKeyId,
        } = req.body;
        const sessionName = name || providedSessionId;
        let apiKeyId = req.apiKey?.id;

        // Admin can provide apiKeyId or auto-create one
        if (req.admin) {
            if (providedApiKeyId) {
                apiKeyId = providedApiKeyId;
            } else {
                // Auto-create API key for admin
                const crypto = await import('crypto');
                const rawKey = crypto.randomBytes(32).toString('hex');
                const prefix = 'wak_' + crypto.randomBytes(4).toString('hex');
                const fullKey = `${prefix}.${rawKey}`;
                const hash = crypto
                    .createHash('sha256')
                    .update(fullKey)
                    .digest('hex');

                const { ApiKeyRepository } =
                    await import('../repositories/ApiKeyRepository.js');
                const apiKeyRepo = new ApiKeyRepository();
                apiKeyId = await apiKeyRepo.create({
                    name: `Auto-generated for session: ${sessionName}`,
                    prefix,
                    keyHash: hash,
                    fullKey,
                    createdBy: 'admin',
                });
            }
        } else {
            if (!apiKeyId) {
                throw new AppError('API key required', 401, 'UNAUTHORIZED');
            }
        }

        if (!sessionName) {
            throw new ValidationError('name or sessionId is required');
        }

        if (!apiKeyId) {
            throw new AppError('API key required', 401, 'UNAUTHORIZED');
        }

        const result = await whatsAppService.startSession(
            apiKeyId,
            sessionName,
            webhookUrl,
        );
        res.json(result);
    },
);

export const getSessionStatus = asyncHandler(
    async (req: Request, res: Response) => {
        const sessionId = safeSessionId(req);
        const result = await whatsAppService.getSessionStatus(sessionId);
        if (!result) {
            throw new NotFoundError('Session not found');
        }
        res.json(result);
    },
);

export const getSessions = asyncHandler(
    async (req: ApiKeyRequest, res: Response) => {
        const apiKeyId = req.apiKey?.id;
        if (req.admin) {
            const sessions = await whatsAppService.getAllSessions();
            res.json({ sessions });
            return;
        }
        if (!apiKeyId) {
            throw new AppError('API key required', 401, 'UNAUTHORIZED');
        }
        const sessions = await whatsAppService.getSessionsByApiKey(apiKeyId);
        res.json({ sessions });
    },
);

export const stopSession = asyncHandler(async (req: Request, res: Response) => {
    const sessionId = safeSessionId(req);
    const result = await whatsAppService.stopSession(sessionId);
    res.json(result);
});

export const logoutSession = asyncHandler(
    async (req: Request, res: Response) => {
        const sessionId = safeSessionId(req);
        const result = await whatsAppService.logoutSession(sessionId);
        res.json(result);
    },
);

export const getSessionQR = asyncHandler(
    async (req: Request, res: Response) => {
        const sessionId = safeSessionId(req);
        const result = whatsAppService.getQRCode(sessionId);
        if (!result) {
            throw new NotFoundError('Session not found');
        }

        if (result.status === 'CONNECTED') {
            res.json({
                status: 'CONNECTED',
                message: 'Session already connected',
            });
            return;
        }

        if (!result.qr) {
            res.status(404).json({
                status: result.status,
                message: 'QR code not available yet',
            });
            return;
        }

        try {
            const qrImage = await QRCode.toDataURL(result.qr);
            res.json({ ...result, qrImage });
        } catch {
            res.json(result);
        }
    },
);

export const sendText = asyncHandler(async (req: Request, res: Response) => {
    const sessionId = safeSessionId(req);
    const { to, message } = req.body;

    const sessionStatus = await whatsAppService.getSessionStatus(sessionId);
    if (!sessionStatus || sessionStatus.status !== 'CONNECTED') {
        throw new AppError('Session not active', 404, 'SESSION_NOT_ACTIVE');
    }

    const job = await messageQueue.add('text', {
        sessionId,
        to,
        message,
    });

    res.json({ status: 'queued', jobId: job.id });
});

export const sendMedia = asyncHandler(async (req: Request, res: Response) => {
    const sessionId = safeSessionId(req);
    const { to, type, mediaUrl, caption } = req.body;

    const sessionStatus = await whatsAppService.getSessionStatus(sessionId);
    if (!sessionStatus || sessionStatus.status !== 'CONNECTED') {
        throw new AppError('Session not active', 404, 'SESSION_NOT_ACTIVE');
    }

    const job = await messageQueue.add('media', {
        sessionId,
        to,
        type,
        mediaUrl,
        caption,
    });

    res.json({ status: 'queued', jobId: job.id });
});

export const sendTemplate = asyncHandler(
    async (req: Request, res: Response) => {
        const sessionId = safeSessionId(req);
        const { to, templateName, variables } = req.body;

        const sessionStatus = await whatsAppService.getSessionStatus(sessionId);
        if (!sessionStatus || sessionStatus.status !== 'CONNECTED') {
            throw new AppError('Session not active', 404, 'SESSION_NOT_ACTIVE');
        }

        const job = await messageQueue.add('template', {
            sessionId,
            to,
            templateName,
            variables: variables || {},
        });

        res.json({ status: 'queued', jobId: job.id });
    },
);

export const sendFile = asyncHandler(async (req: Request, res: Response) => {
    const sessionId = safeSessionId(req);
    const { to } = req.body;
    const { captions } = req.body;
    const files = req.files as Express.Multer.File[];

    const cleanupFiles = () => {
        if (files) {
            files.forEach((file) => fs.unlink(file.path, () => {}));
        }
    };

    if (!to || !files || files.length === 0) {
        cleanupFiles();
        throw new ValidationError('Missing parameters: to, files');
    }

    const sessionStatus = await whatsAppService.getSessionStatus(sessionId);
    if (!sessionStatus || sessionStatus.status !== 'CONNECTED') {
        cleanupFiles();
        throw new AppError('Session not active', 404, 'SESSION_NOT_ACTIVE');
    }

    let captionsArray: string[] = [];
    if (Array.isArray(captions)) {
        captionsArray = captions as string[];
    } else if (captions) {
        captionsArray = [captions as string];
    }

    const jobs = [];
    for (const file of files) {
        const isValidSignature = await validateFileSignature(
            file.path,
            file.mimetype,
        );
        if (!isValidSignature) {
            cleanupFiles();
            throw new ValidationError(
                `Security validation failed for file: ${file.originalname}. Content does not match extension/type.`,
            );
        }
    }

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileCaption = captionsArray[i] || '';

        const job = await messageQueue.add('file', {
            sessionId,
            to,
            path: file.path,
            mimetype: file.mimetype,
            originalname: file.originalname,
            caption: fileCaption,
        });
        jobs.push({
            file: file.originalname,
            status: 'queued',
            jobId: job.id,
        });
    }

    res.json({ status: 'success', jobs });
});

export const getMessageLog = asyncHandler(
    async (req: Request, res: Response) => {
        const sessionId = safeSessionId(req);
        const log = await whatsAppService.getMessageLog(sessionId || null);
        res.json({ status: 'success', messages: log });
    },
);
