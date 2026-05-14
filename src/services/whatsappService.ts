import { SessionManager } from './session/SessionManager.js';
import { MessageSender } from './message/MessageSender.js';
import templateService from './templateService.js';
import { WebhookDispatcher } from './webhook/WebhookDispatcher.js';

class WhatsAppServiceBridge {
    public sessionManager: SessionManager;
    public messageSender: MessageSender;
    public webhookDispatcher: WebhookDispatcher;

    constructor() {
        this.sessionManager = new SessionManager();
        this.messageSender = new MessageSender(this.sessionManager);
        this.webhookDispatcher = new WebhookDispatcher();
    }

    async startSession(
        apiKeyId: string,
        name: string,
        webhookUrl?: string | null,
        isAdmin?: boolean,
    ) {
        return await this.sessionManager.startSession(
            apiKeyId,
            name,
            webhookUrl,
            isAdmin,
        );
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

    async getSessionsByApiKey(apiKeyId: string) {
        return this.sessionManager.getSessionsByApiKey(apiKeyId);
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
        fileObj: { path: string; mimetype: string; originalname: string },
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
        if (!sessionId) return [];
        return this.sessionManager.getMessageLog(sessionId);
    }
}

export default new WhatsAppServiceBridge();
