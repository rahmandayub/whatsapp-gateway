import { Request, Response } from 'express';
import whatsAppService from '../services/whatsappService.js';
import QRCode from 'qrcode';
import fs from 'fs';

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

export const getSessionStatus = (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const result = whatsAppService.getSessionStatus(sessionId);
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
        const result = await whatsAppService.sendTextMessage(
            sessionId,
            to,
            message,
        );
        res.json({ status: 'success', result });
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
        const result = await whatsAppService.sendMediaMessage(
            sessionId,
            to,
            type,
            mediaUrl,
            caption,
        );
        res.json({ status: 'success', result });
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
        const result = await whatsAppService.sendTemplateMessage(
            sessionId,
            to,
            templateName,
            variables || {},
        );
        res.json({ status: 'success', result });
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

        // Normalize captions to array to match files index
        let captionsArray: string[] = [];
        if (Array.isArray(captions)) {
            captionsArray = captions as string[];
        } else if (captions) {
            captionsArray = [captions as string];
        }

        const results = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileCaption = captionsArray[i] || ''; // Map caption to file by index

            try {
                const result = await whatsAppService.sendFileMessage(
                    sessionId,
                    to,
                    file,
                    fileCaption,
                );
                results.push({
                    file: file.originalname,
                    status: 'success',
                    id: result?.key?.id,
                });
            } catch (error: any) {
                console.error(
                    `Failed to send file ${file.originalname}:`,
                    error,
                );
                results.push({
                    file: file.originalname,
                    status: 'error',
                    error: error.message,
                });
            } finally {
                // Cleanup uploaded file immediately after processing
                fs.unlink(file.path, (err) => {
                    if (err) console.error('Failed to cleanup file:', err);
                });
            }
        }

        res.json({ status: 'success', results });
    } catch (error: any) {
        // Cleanup remaining files on catastrophic error
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
