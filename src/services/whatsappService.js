import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import qrcode from 'qrcode-terminal';
import pool from '../config/database.js';

class WhatsAppService {
    constructor() {
        this.sessions = new Map();
    }

    async sendWebhook(url, event, data) {
        if (!url) return;
        try {
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event, ...data, timestamp: Date.now() }),
            });
        } catch (error) {
            console.error(`Failed to send webhook to ${url}:`, error.message);
        }
    }

    async startSession(sessionId, webhookUrl) {
        // DB Persistence & Ownership Check
        const client = await pool.connect();
        try {
            const checkQuery = 'SELECT * FROM sessions WHERE session_id = $1';
            const { rows } = await client.query(checkQuery, [sessionId]);

            if (rows.length > 0) {
                const existingSession = rows[0];
                if (existingSession.webhook_url !== webhookUrl) {
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
            logger: pino({ level: 'silent' }), // Suppress internal logs
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

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            const sessionData = this.sessions.get(sessionId);

            // if (!sessionData) return; // Don't return, we might need to handle cleanup/reconnect even if map is stale? No, keep it safe.
            if (!sessionData && connection !== 'close') return; // Only process 'close' if session missing? No, mostly rely on map.

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
                const errorMessage =
                    lastDisconnect.error?.message || 'Unknown Error';
                const statusCode = lastDisconnect.error?.output?.statusCode;

                const shouldReconnect =
                    lastDisconnect.error instanceof Boom &&
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
                    await this.sendWebhook(webhookUrl, 'connection_update', {
                        sessionId,
                        status: 'DISCONNECTED',
                    });
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
        });

        sock.ev.on('messages.upsert', async ({ messages }) => {
            const sessionData = this.sessions.get(sessionId);
            if (!sessionData) return;

            for (const msg of messages) {
                if (!msg.key.fromMe && sessionData.webhookUrl) {
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

    getSessionStatus(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return null;
        return {
            sessionId,
            status: session.status,
            whatsappId: session.whatsappId,
        };
    }

    getQRCode(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return null;
        return {
            sessionId,
            status: session.status,
            qr: session.qr,
        };
    }

    getAllSessions() {
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

    async stopSession(sessionId) {
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
            session.sock.end(undefined);
            this.sessions.delete(sessionId);
            await pool.query(
                'UPDATE sessions SET status = $1 WHERE session_id = $2',
                ['STOPPED', sessionId],
            );
            return { status: 'success', message: 'Session stopped' };
        } catch (error) {
            this.sessions.delete(sessionId);
            return {
                status: 'error',
                message: 'Error stopping session',
                error: error.message,
            };
        }
    }

    async logoutSession(sessionId) {
        const session = this.sessions.get(sessionId);
        const authPath = `auth_info_baileys/${sessionId}`;

        try {
            if (session) {
                await session.sock.logout(); // Actual Logout from WA
                session.sock.end(undefined);
                this.sessions.delete(sessionId);
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
        } catch (error) {
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

    async sendTextMessage(sessionId, to, text) {
        const session = this.sessions.get(sessionId);
        if (!session) throw new Error('Session not found');

        const result = await session.sock.sendMessage(to, { text });
        return result;
    }

    async sendMediaMessage(sessionId, to, type, mediaUrl, caption) {
        const session = this.sessions.get(sessionId);
        if (!session) throw new Error('Session not found');

        const result = await session.sock.sendMessage(to, {
            [type]: { url: mediaUrl },
            caption,
        });
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
