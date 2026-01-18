import fs from 'fs';
import path from 'path';
import { CONFIG } from '../../config/paths.js';
import makeWASocket, { useMultiFileAuthState, WASocket } from '@whiskeysockets/baileys';
import pino from 'pino';
import { SessionStore } from './SessionStore.js';
import { SessionRepository } from '../../repositories/SessionRepository.js';
import { ConnectionHandler } from './ConnectionHandler.js';
import { WebhookDispatcher } from '../webhook/WebhookDispatcher.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../errors/AppError.js';

export class SessionManager {
    private sessionStore: SessionStore;
    private sessionRepo: SessionRepository;
    private connectionHandler: ConnectionHandler;
    private webhookDispatcher: WebhookDispatcher;

    constructor() {
        this.sessionStore = new SessionStore();
        this.sessionRepo = new SessionRepository();
        this.webhookDispatcher = new WebhookDispatcher();

        // Circular dependency resolution: ConnectionHandler needs to call back into SessionManager
        this.connectionHandler = new ConnectionHandler(
            this.sessionStore,
            this.sessionRepo,
            this.webhookDispatcher,
            this.startSession.bind(this) // Callback for reconnection
        );
    }

    // Expose store for other services (MessageSender)
    getSession(sessionId: string) {
        return this.sessionStore.get(sessionId);
    }

    getAllSessions() {
        return this.sessionStore.getAll();
    }

    async startSession(sessionId: string, webhookUrl?: string | null) {
        // DB Check
        const existingSession = await this.sessionRepo.findById(sessionId);

        if (existingSession) {
             if (!webhookUrl) {
                 webhookUrl = existingSession.webhook_url;
             } else if (existingSession.webhook_url && existingSession.webhook_url !== webhookUrl) {
                 throw new AppError('Session ID exists but ownership verification failed', 403, 'FORBIDDEN');
             }

             if (this.sessionStore.has(sessionId)) {
                 return { status: 'already_active', message: 'Session already active' };
             }
        } else {
            await this.sessionRepo.create(sessionId, webhookUrl || null);
        }

        const authPath = path.join(CONFIG.AUTH_DIR, sessionId);
        if (!fs.existsSync(authPath)) {
            fs.mkdirSync(authPath, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(authPath);

        const sock = makeWASocket({
            logger: pino({ level: 'silent' }) as any,
            printQRInTerminal: false,
            auth: state,
        });

        this.sessionStore.set(sessionId, {
            sock,
            status: 'CONNECTING',
            webhookUrl,
            qr: null,
            reconnectAttempts: 0
        });

        sock.ev.on('creds.update', saveCreds);
        sock.ev.on('connection.update', (update) =>
            this.connectionHandler.handleConnectionUpdate(sessionId, update)
        );

        // TODO: Move message handling to MessageHandler (Phase 3.1)
        // For now, minimal to keep functionality
        // We will refactor message handling in next step or now?
        // Let's add the message listener here but delegate to a method we will create later or now.
        // Actually the plan said "Break Up WhatsAppService". MessageSender is for SENDING.
        // Incoming messages logic was in WhatsAppService. We should extract that too.
        // Maybe "IncomingMessageHandler".

        return { status: 'pending', message: 'Session initiation started', sessionId };
    }

    async stopSession(sessionId: string) {
        const session = this.sessionStore.get(sessionId);

        if (!session) {
            await this.sessionRepo.updateStatus(sessionId, 'STOPPED');
            return { status: 'success', message: 'Session stopped (was inactive)' };
        }

        try {
            this.sessionStore.delete(sessionId);
            session.sock.end(undefined);
            await this.sessionRepo.updateStatus(sessionId, 'STOPPED');
            logger.info({ sessionId }, 'Session stopped');
            return { status: 'success', message: 'Session stopped' };
        } catch (error: any) {
            this.sessionStore.delete(sessionId);
            throw new AppError(`Error stopping session: ${error.message}`, 500, 'STOP_ERROR');
        }
    }

    async logoutSession(sessionId: string) {
        const session = this.sessionStore.get(sessionId);
        const authPath = path.join(CONFIG.AUTH_DIR, sessionId);

        try {
            if (session) {
                this.sessionStore.delete(sessionId);
                await session.sock.logout();
                session.sock.end(undefined);
            }

            if (fs.existsSync(authPath)) {
                fs.rmSync(authPath, { recursive: true, force: true });
            }

            await this.sessionRepo.delete(sessionId);
            return { status: 'success', message: 'Session logged out and data cleared' };
        } catch (error: any) {
             // Cleanup anyway
            if (fs.existsSync(authPath)) {
                fs.rmSync(authPath, { recursive: true, force: true });
            }
            await this.sessionRepo.delete(sessionId);
            throw new AppError(`Error logging out: ${error.message}`, 500, 'LOGOUT_ERROR');
        }
    }

    async restoreSessions() {
        const sessions = await this.sessionRepo.findActiveSessions();
        logger.info(`Restoring ${sessions.length} sessions...`);

        for (const session of sessions) {
            try {
                // startSession signature: sessionId, webhookUrl
                await this.startSession(session.session_id, session.webhook_url);
            } catch (err) {
                logger.error({ sessionId: session.session_id, err }, 'Failed to restore session');
            }
            await new Promise(resolve => setTimeout(resolve, 500)); // Throttling
        }
    }

    // Pass-through methods for querying status
    async getSessionStatus(sessionId: string) {
        const session = this.sessionStore.get(sessionId);
        if (session) {
            return { sessionId, status: session.status, whatsappId: session.whatsappId };
        }

        const dbSession = await this.sessionRepo.findById(sessionId);
        if (dbSession) {
            return { sessionId, status: dbSession.status, whatsappId: dbSession.whatsapp_id };
        }
        return null;
    }

    getQRCode(sessionId: string) {
        const session = this.sessionStore.get(sessionId);
        return session ? { sessionId, status: session.status, qr: session.qr } : null;
    }

    async getAllSessionsStatus() {
        // Merge DB and Memory
        const dbSessions = await this.sessionRepo.findAll();
        return dbSessions.map(row => {
             const mem = this.sessionStore.get(row.session_id);
             return {
                 sessionId: row.session_id,
                 status: mem ? mem.status : row.status,
                 whatsappId: mem ? mem.whatsappId : row.whatsapp_id
             };
        });
    }
}
