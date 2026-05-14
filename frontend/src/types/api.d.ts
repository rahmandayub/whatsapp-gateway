export interface Session {
    sessionId: string;
    name: string;
    status: 'CONNECTED' | 'SCANNING_QR' | 'CONNECTING' | 'STOPPED' | 'DISCONNECTED';
    whatsappId?: string;
}
export interface Template {
    id: number;
    name: string;
    content: string;
    category?: string;
    language?: string;
    created_at?: string;
}
export interface MessageLogEntry {
    id: string;
    timestamp: string;
    direction: 'incoming' | 'outgoing';
    from?: string;
    to?: string;
    sessionId: string;
    text: string;
    type?: string;
}
export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
    show: boolean;
}
export interface ApiResponse {
    status?: string;
    message?: string;
    sessions?: Session[];
    data?: {
        templates?: Template[];
    };
    messages?: MessageLogEntry[];
    qr?: string;
    qrImage?: string;
    result?: {
        messages?: Array<{
            key?: {
                id?: string;
            };
        }>;
    };
    apiKeys?: unknown[];
    apiKey?: unknown;
    logs?: unknown[];
    [key: string]: unknown;
}
