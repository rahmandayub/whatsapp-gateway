export interface WebhookPayload {
    event: 'qr_code' | 'connection_update' | 'message_received' | 'message_status_update';
    sessionId: string;
    [key: string]: any;
}

export interface WebhookJobData {
    url: string;
    event: string;
    data: any;
    timestamp: number;
    sessionId?: string;
    requestId?: string;
}
