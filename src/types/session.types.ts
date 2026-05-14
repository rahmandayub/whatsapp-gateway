export interface SessionData {
    sock: unknown; // WASocket type, will fix types in next step
    status:
        | 'CONNECTING'
        | 'CONNECTED'
        | 'DISCONNECTED'
        | 'SCANNING_QR'
        | 'STOPPED'
        | 'STOPPED_ERROR';
    webhookUrl?: string | null;
    qr?: string | null;
    whatsappId?: string;
    reconnectAttempts: number;
    lastReconnectAt?: number;
}
