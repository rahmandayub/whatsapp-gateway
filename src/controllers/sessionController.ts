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

export const startSession = asyncHandler(
    async (req: Request, res: Response) => {
        const { sessionId, webhookUrl } = req.body;
        // Joi middleware handles basic validation, but good to be safe
        if (!sessionId) {
            throw new ValidationError('sessionId is required');
        }
        const result = await whatsAppService.startSession(
            sessionId,
            webhookUrl,
        );
        res.json(result);
    },
);

export const getSessionStatus = asyncHandler(
    async (req: Request, res: Response) => {
        const { sessionId } = req.params;
        const result = await whatsAppService.getSessionStatus(sessionId);
        if (!result) {
            throw new NotFoundError('Session not found');
        }
        res.json(result);
    },
);

export const getSessions = asyncHandler(async (req: Request, res: Response) => {
    const sessions = await whatsAppService.getAllSessions();
    res.json({ sessions });
});

export const stopSession = asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const result = await whatsAppService.stopSession(sessionId);
    res.json(result);
});

export const logoutSession = asyncHandler(
    async (req: Request, res: Response) => {
        const { sessionId } = req.params;
        const result = await whatsAppService.logoutSession(sessionId);
        res.json(result);
    },
);

export const getSessionQR = asyncHandler(
    async (req: Request, res: Response) => {
        const { sessionId } = req.params;
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
            // If we are connecting but no QR yet, or any other state without QR
            res.status(404).json({
                status: result.status,
                message: 'QR code not available yet',
            });
            return;
        }

        try {
            const qrImage = await QRCode.toDataURL(result.qr);
            res.json({ ...result, qrImage });
        } catch (err) {
            console.error('QR Generation error:', err);
            // Fallback to sending just the raw string if image gen fails
            res.json(result);
        }
    },
);

export const sendText = asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const { to, message } = req.body;

    // Check if session is connected
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
    const { sessionId } = req.params;
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
        const { sessionId } = req.params;
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
    const { sessionId } = req.params;
    const { to } = req.body;
    // multer parses 'captions' field.
    let { captions } = req.body;
    const files = req.files as Express.Multer.File[];

    // Ensure cleanup helper
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

    // Normalize captions to array to match files index
    let captionsArray: string[] = [];
    if (Array.isArray(captions)) {
        captionsArray = captions as string[];
    } else if (captions) {
        captionsArray = [captions as string];
    }

    const jobs = [];
    try {
        // First pass: Validation
        for (const file of files) {
            // Task 1.3.3: MIME type validation
            const isValidSignature = await validateFileSignature(
                file.path,
                file.mimetype,
            );
            if (!isValidSignature) {
                // Fail the whole batch before queueing anything
                cleanupFiles();
                throw new ValidationError(
                    `Security validation failed for file: ${file.originalname}. Content does not match extension/type.`,
                );
            }
        }

        // Second pass: Queueing
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
    } catch (error) {
        // Catch errors during loop (e.g. queue add fail)
        // If we threw ValidationError above, it goes here.
        // We already cleaned up in the loop for validation error?
        // No, we called cleanupFiles() then threw.
        // Re-throw to let global handler catch it.
        throw error;
    }

    res.json({ status: 'success', jobs });
});

export const getMessageLog = asyncHandler(
    async (req: Request, res: Response) => {
        const { sessionId } = req.params;
        const log = await whatsAppService.getMessageLog(sessionId || null);
        res.json({ status: 'success', messages: log });
    },
);
