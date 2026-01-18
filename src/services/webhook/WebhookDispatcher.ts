import { webhookQueue } from '../../queues/webhookQueue.js';

export class WebhookDispatcher {
    async dispatch(url: string | undefined | null, event: string, data: any) {
        if (!url) return;

        await webhookQueue.add('webhook', {
            url,
            event,
            data,
            timestamp: Date.now()
        });
    }
}
