import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    WASocket,
    ConnectionState,
    BaileysEventMap,
    proto,
    AnyMessageContent,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import qrcode from 'qrcode-terminal';
import pool from '../config/database.js';
import templateService from './templateService.js';

interface SessionData {
    sock: WASocket;
    status: string;
    webhookUrl?: string | null;
    qr?: string | null;
    whatsappId?: string;
}

interface MessageLogEntry {
    id: string;
    sessionId: string;
    direction: 'incoming' | 'outgoing';
    timestamp: string;
    [key: string]: any;
}

interface StartSessionResponse {
    status: string;
    message: string;
    sessionId?: string;
}

interface WebhookData {
    event: string;
    [key: string]: any;
}

class WhatsAppService {
    private sessions: Map<string, SessionData>;
    private messageLog: MessageLogEntry[];
    private maxLogSize: number;

    constructor() {
        this.sessions = new Map();
        this.messageLog = []; // In-memory message event log (not persisted)
        this.maxLogSize = 100; // Keep last 100 messages
    }

    addToLog(
        sessionId: string,
        direction: 'incoming' | 'outgoing',
        message: any,
    ) {
        this.messageLog.unshift({
            id: Date.now().toString(),
            sessionId,
            direction, // 'incoming' or 'outgoing'
            ...message,
            timestamp: new Date().toISOString(),
        });
        // Trim log to max size
        if (this.messageLog.length > this.maxLogSize) {
            this.messageLog.pop();
        }
    }

    getMessageLog(sessionId: string | null = null) {
        if (sessionId) {
            return this.messageLog.filter((m) => m.sessionId === sessionId);
        }
        return this.messageLog;
    }

    async sendWebhook(
        url: string | undefined | null,
        event: string,
        data: any,
    ) {
        if (!url) return;
        try {
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event, ...data, timestamp: Date.now() }),
            });
        } catch (error: any) {
            console.error(`Failed to send webhook to ${url}:`, error.message);
        }
    }

    async startSession(
        sessionId: string,
        webhookUrl?: string | null,
    ): Promise<StartSessionResponse> {
        // DB Persistence & Ownership Check
        const client = await pool.connect();
        try {
            const checkQuery = 'SELECT * FROM sessions WHERE session_id = $1';
            const { rows } = await client.query(checkQuery, [sessionId]);

            if (rows.length > 0) {
                const existingSession = rows[0];

                // Allow resume: if no webhookUrl provided, use the stored one
                if (!webhookUrl) {
                    webhookUrl = existingSession.webhook_url;
                } else if (
                    existingSession.webhook_url &&
                    existingSession.webhook_url !== webhookUrl
                ) {
                    // Ownership check only if both are provided and differ
                    return {
                        status: 'error',
                        message:
                            'Session ID exists but ownership verification failed (Webhook URL mismatch).',
                    };
                }

                // If it exists in DB but not in memory, we allow reconnection
                if (this.sessions.has(sessionId)) {
                    return {
                        status: 'already_active',
                        message: 'Session already active',
                    };
                }
            } else {
                // New session
                const insertQuery =
                    'INSERT INTO sessions (session_id, webhook_url, status) VALUES ($1, $2, $3)';
                await client.query(insertQuery, [
                    sessionId,
                    webhookUrl,
                    'CONNECTING',
                ]);
            }
        } finally {
            client.release();
        }

        const authPath = `auth_info_baileys/${sessionId}`;
        if (!fs.existsSync(authPath)) {
            fs.mkdirSync(authPath, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(authPath);

        const sock = makeWASocket({
            logger: pino({ level: 'silent' }) as any, // Suppress internal logs
            printQRInTerminal: false, // We handle QR via events
            auth: state,
        });

        this.sessions.set(sessionId, {
            sock,
            status: 'CONNECTING',
            webhookUrl,
            qr: null,
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on(
            'connection.update',
            async (update: Partial<ConnectionState>) => {
                const { connection, lastDisconnect, qr } = update;
                const sessionData = this.sessions.get(sessionId);

                // if (!sessionData) return; // Don't return, we might need to handle cleanup/reconnect even if map is stale? No, keep it safe.
                if (!sessionData) return;

                if (qr) {
                    if (sessionData) {
                        sessionData.status = 'SCANNING_QR';
                        sessionData.qr = qr;
                        await pool.query(
                            'UPDATE sessions SET status = $1 WHERE session_id = $2',
                            ['SCANNING_QR', sessionId],
                        );
                    }
                    console.log(`[${sessionId}] QR Code generated`);
                    qrcode.generate(qr, { small: true }); // Print to console
                    await this.sendWebhook(webhookUrl, 'qr_code', {
                        sessionId,
                        qrCode: qr,
                    });
                }

                if (connection === 'close') {
                    const error = lastDisconnect?.error as Boom | undefined;
                    const errorMessage = error?.message || 'Unknown Error';
                    const statusCode = error?.output?.statusCode;

                    const shouldReconnect =
                        statusCode !== DisconnectReason.loggedOut;

                    console.error(`[${sessionId}] Connection closed details:`, {
                        message: errorMessage,
                        statusCode: statusCode,
                        shouldReconnect,
                    });

                    // CLEANUP: Remove session from map to allow 'startSession' to run again
                    this.sessions.delete(sessionId);

                    if (shouldReconnect) {
                        // Small delay to prevent tight loops
                        setTimeout(
                            () => this.startSession(sessionId, webhookUrl),
                            2000,
                        );
                    } else {
                        await pool.query(
                            'UPDATE sessions SET status = $1 WHERE session_id = $2',
                            ['DISCONNECTED', sessionId],
                        );
                        await this.sendWebhook(
                            webhookUrl,
                            'connection_update',
                            {
                                sessionId,
                                status: 'DISCONNECTED',
                            },
                        );
                    }
                } else if (connection === 'open') {
                    console.log(`[${sessionId}] Connected`);
                    const waId = sock.user?.id;
                    if (sessionData) {
                        sessionData.status = 'CONNECTED';
                        sessionData.qr = null; // Clear QR on success
                        sessionData.whatsappId = waId;
                    }
                    await pool.query(
                        'UPDATE sessions SET status = $1, whatsapp_id = $2 WHERE session_id = $3',
                        ['CONNECTED', waId, sessionId],
                    );
                    await this.sendWebhook(webhookUrl, 'connection_update', {
                        sessionId,
                        status: 'CONNECTED',
                        whatsappId: waId,
                    });
                }
            },
        );

        sock.ev.on('messages.upsert', async ({ messages }) => {
            const sessionData = this.sessions.get(sessionId);
            if (!sessionData) return;

            for (const msg of messages) {
                // Log all messages (incoming and outgoing from device)
                const isFromMe = msg.key.fromMe;
                const messageContent = msg.message;
                const textContent =
                    messageContent?.conversation ||
                    messageContent?.extendedTextMessage?.text ||
                    messageContent?.imageMessage?.caption ||
                    messageContent?.videoMessage?.caption ||
                    '[Media/Other]';

                this.addToLog(sessionId, isFromMe ? 'outgoing' : 'incoming', {
                    from: msg.key.remoteJid,
                    type: Object.keys(messageContent || {})[0] || 'unknown',
                    text: textContent,
                    messageId: msg.key.id,
                    pushName: msg.pushName,
                });

                if (!isFromMe && sessionData.webhookUrl) {
                    await this.sendWebhook(
                        sessionData.webhookUrl,
                        'message_received',
                        {
                            sessionId,
                            message: msg,
                        },
                    );
                }
            }
        });

        return {
            status: 'pending',
            message: 'Session initiation started',
            sessionId,
        };
    }

    async getSessionStatus(sessionId: string) {
        const session = this.sessions.get(sessionId);
        if (session) {
            return {
                sessionId,
                status: session.status,
                whatsappId: session.whatsappId,
            };
        }

        // Check DB if not in memory
        try {
            const result = await pool.query(
                'SELECT status, whatsapp_id FROM sessions WHERE session_id = $1',
                [sessionId],
            );
            if (result.rows.length > 0) {
                return {
                    sessionId,
                    status: result.rows[0].status,
                    whatsappId: result.rows[0].whatsapp_id,
                };
            }
        } catch (error) {
            console.error('Error fetching session status from DB:', error);
        }

        return null;
    }

    getQRCode(sessionId: string) {
        const session = this.sessions.get(sessionId);
        if (!session) return null;
        return {
            sessionId,
            status: session.status,
            qr: session.qr,
        };
    }

    async getAllSessions() {
        try {
            const result = await pool.query(
                'SELECT session_id, status, whatsapp_id FROM sessions ORDER BY created_at DESC',
            );
            const sessionsList = result.rows.map((row) => {
                // Check if session is active in memory for real-time status
                const inMemorySession = this.sessions.get(row.session_id);
                return {
                    sessionId: row.session_id,
                    status: inMemorySession
                        ? inMemorySession.status
                        : row.status,
                    whatsappId: inMemorySession
                        ? inMemorySession.whatsappId
                        : row.whatsapp_id,
                };
            });
            return sessionsList;
        } catch (error) {
            console.error('Error fetching sessions from DB:', error);
            // Fallback to in-memory only
            const sessionsList = [];
            for (const [id, data] of this.sessions.entries()) {
                sessionsList.push({
                    sessionId: id,
                    status: data.status,
                    whatsappId: data.whatsappId,
                });
            }
            return sessionsList;
        }
    }

    async stopSession(sessionId: string) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            // Even if not in memory, check DB to ensure status is updated if it was stuck
            await pool.query(
                'UPDATE sessions SET status = $1 WHERE session_id = $2',
                ['STOPPED', sessionId],
            );
            return {
                status: 'success',
                message: 'Session stopped (or was already inactive)',
            };
        }

        try {
            // SOFT STOP: Do NOT logout, just close socket to stop validation/traffic
            this.sessions.delete(sessionId);
            session.sock.end(undefined);
            await pool.query(
                'UPDATE sessions SET status = $1 WHERE session_id = $2',
                ['STOPPED', sessionId],
            );
            console.log(`[${sessionId}] Session stopped`);
            return { status: 'success', message: 'Session stopped' };
        } catch (error: any) {
            this.sessions.delete(sessionId);
            return {
                status: 'error',
                message: 'Error stopping session',
                error: error.message,
            };
        }
    }

    async logoutSession(sessionId: string) {
        const session = this.sessions.get(sessionId);
        const authPath = `auth_info_baileys/${sessionId}`;

        try {
            if (session) {
                this.sessions.delete(sessionId);
                await session.sock.logout(); // Actual Logout from WA
                session.sock.end(undefined);
            } else {
                // Try to load state just to logout?
                // It's tricky if we don't have the sock.
                // For now, we assume if it's not in memory, we just clean up files.
                // Ideally we should try to restore and logout, but that's complex.
                // We will just proceed to delete files which effectively invalidates local credentials.
            }

            // Delete Auth Files
            if (fs.existsSync(authPath)) {
                fs.rmSync(authPath, { recursive: true, force: true });
            }

            // Remove from DB
            await pool.query('DELETE FROM sessions WHERE session_id = $1', [
                sessionId,
            ]);

            return {
                status: 'success',
                message: 'Session logged out and data cleared',
            };
        } catch (error: any) {
            console.error(`Logout failed for ${sessionId}`, error);
            // Attempt cleanup anyway
            if (fs.existsSync(authPath)) {
                fs.rmSync(authPath, { recursive: true, force: true });
            }
            await pool.query('DELETE FROM sessions WHERE session_id = $1', [
                sessionId,
            ]);

            return {
                status: 'error',
                message: 'Error during logout (cleanup attempted)',
                error: error.message,
            };
        }
    }

    async sendTextMessage(sessionId: string, to: string, text: string) {
        const session = this.sessions.get(sessionId);
        if (!session) throw new Error('Session not found');

        const result = await session.sock.sendMessage(to, { text });

        return result;
    }

    async sendMediaMessage(
        sessionId: string,
        to: string,
        type: 'image' | 'video' | 'document',
        mediaUrl: string,
        caption?: string,
    ) {
        const session = this.sessions.get(sessionId);
        if (!session) throw new Error('Session not found');

        // Dynamically create the content object, ensuring the type is one of the allowed keys
        // The type argument is 'image' | 'video' | 'document' which matches keys in AnyMessageContent
        // but TypeScript needs to know that.
        const messageContent = {
            [type]: { url: mediaUrl },
            caption,
        } as unknown as AnyMessageContent;

        const result = await session.sock.sendMessage(to, messageContent);

        return result;
    }

    async sendFileMessage(
        sessionId: string,
        to: string,
        fileObj: Express.Multer.File,
        caption?: string,
    ) {
        const session = this.sessions.get(sessionId);
        if (!session) throw new Error('Session not found');

        const buffer = fs.readFileSync(fileObj.path);
        const mimeType = fileObj.mimetype;
        const fileName = fileObj.originalname;

        // Determine type based on mime
        let messageContent: AnyMessageContent = {} as AnyMessageContent;

        if (mimeType.startsWith('image/')) {
            messageContent = { image: buffer, caption, mimetype: mimeType };
        } else if (mimeType.startsWith('video/')) {
            messageContent = { video: buffer, caption, mimetype: mimeType };
        } else if (mimeType.startsWith('audio/')) {
            messageContent = { audio: buffer, mimetype: mimeType, ptt: false }; // Normal audio
        } else {
            // Default to document
            messageContent = {
                document: buffer,
                caption,
                mimetype: mimeType,
                fileName: fileName,
            };
        }

        const result = await session.sock.sendMessage(to, messageContent);
        return result;
    }

    async sendTemplateMessage(
        sessionId: string,
        to: string,
        templateName: string,
        variables?: Record<string, string>,
    ) {
        const session = this.sessions.get(sessionId);
        if (!session) throw new Error('Session not found');

        const template = await templateService.getTemplateByName(templateName);
        if (!template) throw new Error(`Template '${templateName}' not found`);

        const text = templateService.renderTemplate(template, variables);
        const result = await session.sock.sendMessage(to, { text });

        return result;
    }

    async restoreSessions() {
        const client = await pool.connect();
        try {
            const query =
                "SELECT * FROM sessions WHERE status != 'STOPPED' AND status != 'STOPPED_ERROR'";
            const { rows } = await client.query(query);

            console.log(`Restoring ${rows.length} sessions...`);

            for (const row of rows) {
                console.log(`Restoring session: ${row.session_id}`);
                // Use a different method or flags if restart behavior differs significantly,
                // but for now, startSession handles existence checks (we might need to tweak it to allow stored-but-not-in-memory sessions).

                // Note: startSession checks strictly for ownership. Since we pull from DB, it's owned.
                // It also checks `this.sessions.has(sessionId)`. Since we just started resource, map is empty.
                // So this should effectively restart them.

                this.startSession(row.session_id, row.webhook_url).catch(
                    (err) => {
                        console.error(
                            `Failed to restore session ${row.session_id}:`,
                            err,
                        );
                    },
                );

                // Add delay to prevent CPU spike
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
        } catch (error) {
            console.error('Failed to restore sessions:', error);
        } finally {
            client.release();
        }
    }
}

export default new WhatsAppService();
