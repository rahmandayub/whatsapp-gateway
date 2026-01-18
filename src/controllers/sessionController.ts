import { Request, Response } from 'express';
import whatsAppService from '../services/whatsappService.js';
import { messageQueue } from '../queues/messageQueue.js';
import QRCode from 'qrcode';
import fs from 'fs';
import { validateFileSignature } from '../utils/fileValidation.js';

export const startSession = async (req: Request, res: Response) => {
    try {
        const { sessionId, webhookUrl } = req.body;
        if (!sessionId) {
            return res
                .status(400)
                .json({ status: 'error', message: 'sessionId is required' });
        }
        const result = await whatsAppService.startSession(
            sessionId,
            webhookUrl,
        );
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const getSessionStatus = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const result = await whatsAppService.getSessionStatus(sessionId);
        if (!result) {
            return res
                .status(404)
                .json({ status: 'not_found', message: 'Session not found' });
        }
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const getSessions = async (req: Request, res: Response) => {
    try {
        const sessions = await whatsAppService.getAllSessions();
        res.json({ sessions });
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const stopSession = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const result = await whatsAppService.stopSession(sessionId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const logoutSession = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const result = await whatsAppService.logoutSession(sessionId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const getSessionQR = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const result = whatsAppService.getQRCode(sessionId);
        if (!result || !result.qr) {
            return res
                .status(404)
                .json({ status: 'not_found', message: 'QR code not found' });
        }

        try {
            const qrImage = await QRCode.toDataURL(result.qr);
            res.json({ ...result, qrImage });
        } catch (err) {
            console.error('QR Generation error:', err);
            // Fallback to sending just the raw string if image gen fails
            res.json(result);
        }
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const sendText = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const { to, message } = req.body;
        if (!to || !message) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing parameters: to, message',
            });
        }

        const sessionStatus = await whatsAppService.getSessionStatus(sessionId);
        if (!sessionStatus || sessionStatus.status !== 'CONNECTED') {
            return res.status(404).json({
                status: 'error',
                message: 'Session not active',
            });
        }

        const job = await messageQueue.add('text', {
            sessionId,
            to,
            message,
        });

        res.json({ status: 'queued', jobId: job.id });
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const sendMedia = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const { to, type, mediaUrl, caption } = req.body;
        if (!to || !type || !mediaUrl) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing parameters: to, type, mediaUrl',
            });
        }

        const sessionStatus = await whatsAppService.getSessionStatus(sessionId);
        if (!sessionStatus || sessionStatus.status !== 'CONNECTED') {
            return res.status(404).json({
                status: 'error',
                message: 'Session not active',
            });
        }

        const job = await messageQueue.add('media', {
            sessionId,
            to,
            type,
            mediaUrl,
            caption,
        });

        res.json({ status: 'queued', jobId: job.id });
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const sendTemplate = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const { to, templateName, variables } = req.body;
        if (!to || !templateName) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing parameters: to, templateName',
            });
        }

        const sessionStatus = await whatsAppService.getSessionStatus(sessionId);
        if (!sessionStatus || sessionStatus.status !== 'CONNECTED') {
            return res.status(404).json({
                status: 'error',
                message: 'Session not active',
            });
        }

        const job = await messageQueue.add('template', {
            sessionId,
            to,
            templateName,
            variables: variables || {},
        });

        res.json({ status: 'queued', jobId: job.id });
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const sendFile = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const { to } = req.body;
        // multer parses 'captions' field. If multiple, it's an array. If one, it's a string. If none, undefined/null.
        let { captions } = req.body;
        const files = req.files as Express.Multer.File[];

        if (!to || !files || files.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing parameters: to, files',
            });
        }

        const sessionStatus = await whatsAppService.getSessionStatus(sessionId);
        if (!sessionStatus || sessionStatus.status !== 'CONNECTED') {
            // Cleanup uploaded files since we are rejecting
            if (req.files) {
                (req.files as Express.Multer.File[]).forEach((file) => {
                    fs.unlink(file.path, () => {});
                });
            }
            return res.status(404).json({
                status: 'error',
                message: 'Session not active',
            });
        }

        // Normalize captions to array to match files index
        let captionsArray: string[] = [];
        if (Array.isArray(captions)) {
            captionsArray = captions as string[];
        } else if (captions) {
            captionsArray = [captions as string];
        }

        const jobs = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileCaption = captionsArray[i] || ''; // Map caption to file by index

            // Task 1.3.3: MIME type validation (check magic bytes)
            const isValidSignature = await validateFileSignature(file.path, file.mimetype);
            if (!isValidSignature) {
                // Delete invalid file immediately
                fs.unlink(file.path, () => {});

                // Return 400 immediately for security? Or continue others?
                // Let's fail fast for safety.
                return res.status(400).json({
                    status: 'error',
                    message: `Security validation failed for file: ${file.originalname}. Content does not match extension/type.`
                });
            }

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
            // Note: We do NOT delete the file here. The worker handles cleanup after processing.
        }

        res.json({ status: 'success', jobs });
    } catch (error: any) {
        // Only cleanup on API error (e.g. valid failure before queueing)
        if (req.files) {
            (req.files as Express.Multer.File[]).forEach((file) => {
                fs.unlink(file.path, () => {});
            });
        }
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const getMessageLog = (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const log = whatsAppService.getMessageLog(sessionId || null);
        res.json({ status: 'success', messages: log });
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
