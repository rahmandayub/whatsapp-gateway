import { webhookQueue } from '../../queues/webhookQueue.js';

export class WebhookDispatcher {
    async dispatch(
        url: string | undefined | null,
        event: string,
        data: Record<string, unknown>,
    ) {
        if (!url) return;

        await webhookQueue.add('webhook', {
            url,
            event,
            data,
            timestamp: Date.now(),
        });
    }
}
