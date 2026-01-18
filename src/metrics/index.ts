import client from 'prom-client';

// Create a Registry
export const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register, prefix: 'whatsapp_gateway_' });

// Define custom metrics
export const metrics = {
    httpRequestDuration: new client.Histogram({
        name: 'whatsapp_gateway_http_request_duration_seconds',
        help: 'Duration of HTTP requests in seconds',
        labelNames: ['method', 'route', 'status_code'],
        buckets: [0.1, 0.5, 1, 2, 5],
        registers: [register]
    }),

    activeSessions: new client.Gauge({
        name: 'whatsapp_gateway_active_sessions_total',
        help: 'Number of active WhatsApp sessions',
        registers: [register]
    }),

    messagesQueued: new client.Counter({
        name: 'whatsapp_gateway_messages_queued_total',
        help: 'Total number of messages queued',
        labelNames: ['type', 'direction'],
        registers: [register]
    }),

    webhooksSent: new client.Counter({
        name: 'whatsapp_gateway_webhooks_sent_total',
        help: 'Total number of webhooks sent',
        labelNames: ['status', 'event'],
        registers: [register]
    })
};
