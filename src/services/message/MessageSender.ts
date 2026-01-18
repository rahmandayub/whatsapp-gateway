import { SessionManager } from '../session/SessionManager.js';
import { AnyMessageContent } from '@whiskeysockets/baileys';
import { AppError } from '../../errors/AppError.js';
import fs from 'fs';

export class MessageSender {
    constructor(private sessionManager: SessionManager) {}

    private getSession(sessionId: string) {
        const session = this.sessionManager.getSession(sessionId);
        if (!session) {
            throw new AppError('Session not found or not active', 404, 'SESSION_NOT_FOUND');
        }
        return session;
    }

    async sendText(sessionId: string, to: string, text: string) {
        const session = this.getSession(sessionId);
        return await session.sock.sendMessage(to, { text });
    }

    async sendMedia(
        sessionId: string,
        to: string,
        type: 'image' | 'video' | 'document',
        mediaUrl: string,
        caption?: string
    ) {
        const session = this.getSession(sessionId);
        const content = {
            [type]: { url: mediaUrl },
            caption
        } as unknown as AnyMessageContent;

        return await session.sock.sendMessage(to, content);
    }

    async sendFile(
        sessionId: string,
        to: string,
        fileObj: { path: string, mimetype: string, originalname: string }, // Minimal file interface
        caption?: string
    ) {
        const session = this.getSession(sessionId);
        const buffer = await fs.promises.readFile(fileObj.path);

        let content: AnyMessageContent;
        const mime = fileObj.mimetype;

        if (mime.startsWith('image/')) {
            content = { image: buffer, caption, mimetype: mime };
        } else if (mime.startsWith('video/')) {
            content = { video: buffer, caption, mimetype: mime };
        } else if (mime.startsWith('audio/')) {
            content = { audio: buffer, mimetype: mime, ptt: false };
        } else {
            content = {
                document: buffer,
                caption,
                mimetype: mime,
                fileName: fileObj.originalname
            };
        }

        return await session.sock.sendMessage(to, content);
    }
}
