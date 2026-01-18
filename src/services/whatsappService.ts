// Temporary Bridge to keep existing API working while refactoring
// Phase 3.1: We will replace the monolithic service with the new modular one.
import { SessionManager } from './session/SessionManager.js';
import { MessageSender } from './message/MessageSender.js';
import templateService from './templateService.js';
import { WebhookDispatcher } from './webhook/WebhookDispatcher.js';

// We need to implement the message listening logic that was in startSession
// For now, we'll patch it into SessionManager or handle it here?
// Ideally, SessionManager handles connection logic.
// We can attach the message listener in SessionManager.startSession

class WhatsAppServiceBridge {
    public sessionManager: SessionManager;
    public messageSender: MessageSender;
    public webhookDispatcher: WebhookDispatcher;
    private messageLog: any[] = []; // Temporary log until DB log phase

    constructor() {
        this.sessionManager = new SessionManager();
        this.messageSender = new MessageSender(this.sessionManager);
        this.webhookDispatcher = new WebhookDispatcher();
    }

    // Delegate methods
    async startSession(sessionId: string, webhookUrl?: string | null) {
        return await this.sessionManager.startSession(sessionId, webhookUrl);
    }

    async stopSession(sessionId: string, finalStatus?: string) {
        return this.sessionManager.stopSession(sessionId, finalStatus);
    }

    async logoutSession(sessionId: string) {
        return this.sessionManager.logoutSession(sessionId);
    }

    async getSessionStatus(sessionId: string) {
        return this.sessionManager.getSessionStatus(sessionId);
    }

    async getAllSessions() {
        return this.sessionManager.getAllSessionsStatus();
    }

    getQRCode(sessionId: string) {
        return this.sessionManager.getQRCode(sessionId);
    }

    async restoreSessions() {
        return this.sessionManager.restoreSessions();
    }

    // Message methods
    async sendTextMessage(sessionId: string, to: string, text: string) {
        return this.messageSender.sendText(sessionId, to, text);
    }

    async sendMediaMessage(
        sessionId: string,
        to: string,
        type: 'image' | 'video' | 'document',
        mediaUrl: string,
        caption?: string,
    ) {
        return this.messageSender.sendMedia(
            sessionId,
            to,
            type,
            mediaUrl,
            caption,
        );
    }

    async sendFileMessage(
        sessionId: string,
        to: string,
        fileObj: any,
        caption?: string,
    ) {
        return this.messageSender.sendFile(sessionId, to, fileObj, caption);
    }

    async sendTemplateMessage(
        sessionId: string,
        to: string,
        templateName: string,
        variables?: Record<string, string>,
    ) {
        const template = await templateService.getTemplateByName(templateName);
        if (!template) throw new Error(`Template '${templateName}' not found`);
        const text = templateService.renderTemplate(template, variables);
        return this.messageSender.sendText(sessionId, to, text);
    }

    async getMessageLog(sessionId: string | null) {
        if (!sessionId) return []; // API change: now requires sessionId for DB query, or we implement findAll in repo
        // For backwards compatibility, if sessionId is null, return empty or implement findAll
        // Let's rely on sessionManager to handle it.
        return this.sessionManager.getMessageLog(sessionId);
    }
}

export default new WhatsAppServiceBridge();
