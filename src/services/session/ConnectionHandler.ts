import { DisconnectReason, ConnectionState, Boom } from '@whiskeysockets/baileys'; // Types will be fixed properly in next step
import { SessionStore } from './SessionStore.js';
import { SessionRepository } from '../../repositories/SessionRepository.js';
import { WebhookDispatcher } from '../webhook/WebhookDispatcher.js';
import qrcode from 'qrcode-terminal';
import { logger } from '../../utils/logger.js';

export class ConnectionHandler {
    constructor(
        private sessionStore: SessionStore,
        private sessionRepo: SessionRepository,
        private webhookDispatcher: WebhookDispatcher,
        private reconnectCallback: (sessionId: string) => Promise<void>
    ) {}

    handleConnectionUpdate = async (sessionId: string, update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr } = update;
        const sessionData = this.sessionStore.get(sessionId);

        if (!sessionData) return;

        if (qr) {
            sessionData.status = 'SCANNING_QR';
            sessionData.qr = qr;
            await this.sessionRepo.updateStatus(sessionId, 'SCANNING_QR');

            logger.info({ sessionId }, 'QR Code generated');
            qrcode.generate(qr, { small: true });

            await this.webhookDispatcher.dispatch(sessionData.webhookUrl, 'qr_code', {
                sessionId,
                qrCode: qr,
            });
        }

        if (connection === 'close') {
            const error = (lastDisconnect?.error as any); // Type casting for Boom
            const statusCode = error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            logger.info({ sessionId, statusCode, shouldReconnect }, 'Connection closed');

            // Clean up memory
            this.sessionStore.delete(sessionId);

            if (shouldReconnect) {
                await this.handleReconnect(sessionId, sessionData.reconnectAttempts);
            } else {
                await this.sessionRepo.updateStatus(sessionId, 'DISCONNECTED');
                await this.webhookDispatcher.dispatch(sessionData.webhookUrl, 'connection_update', {
                    sessionId,
                    status: 'DISCONNECTED',
                });
            }
        } else if (connection === 'open') {
            logger.info({ sessionId }, 'Connected');
            const waId = sessionData.sock.user?.id;

            sessionData.status = 'CONNECTED';
            sessionData.qr = null;
            sessionData.whatsappId = waId;
            sessionData.reconnectAttempts = 0;

            await this.sessionRepo.updateStatus(sessionId, 'CONNECTED', waId);
            await this.webhookDispatcher.dispatch(sessionData.webhookUrl, 'connection_update', {
                sessionId,
                status: 'CONNECTED',
                whatsappId: waId,
            });
        }
    }

    private async handleReconnect(sessionId: string, currentAttempts: number) {
        const maxAttempts = 10;

        if (currentAttempts >= maxAttempts) {
            logger.error({ sessionId }, 'Max reconnection attempts reached');
            await this.sessionRepo.updateStatus(sessionId, 'STOPPED_ERROR');

            // We need to fetch webhookUrl again since sessionData is gone from store
            const sessionDB = await this.sessionRepo.findById(sessionId);
            if (sessionDB?.webhook_url) {
                await this.webhookDispatcher.dispatch(sessionDB.webhook_url, 'connection_update', {
                    sessionId,
                    status: 'STOPPED_ERROR',
                    reason: 'Max reconnection attempts reached'
                });
            }
            return;
        }

        const delay = Math.min(Math.pow(2, currentAttempts) * 1000, 300000);
        logger.info({ sessionId, attempt: currentAttempts + 1, delay }, 'Scheduling reconnection');

        setTimeout(async () => {
             // Pass state back?
             // We need to inform the SessionManager to start again with increased attempt count.
             // But SessionManager.startSession usually resets count.
             // The callback handles the restart logic.
             // We need a way to increment the counter after restart.

             // The simplest way is to pass the new count to the callback if it supports it,
             // or let the callback handle retrieving/setting it.
             // See SessionManager implementation (next).
             await this.reconnectCallback(sessionId);

             // After restart, update the attempt count in store
             const newSession = this.sessionStore.get(sessionId);
             if (newSession) {
                 newSession.reconnectAttempts = currentAttempts + 1;
             }
        }, delay);
    }
}
