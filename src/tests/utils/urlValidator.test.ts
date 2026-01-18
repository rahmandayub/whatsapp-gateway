import { describe, it, expect } from 'vitest';
import { validateWebhookUrl } from '../../utils/urlValidator.js';

describe('URL Validator', () => {
    it('should allow valid public URLs', async () => {
        expect(await validateWebhookUrl('https://google.com')).toBe(true);
        expect(await validateWebhookUrl('http://example.com/webhook')).toBe(true);
    });

    it('should reject non-HTTP protocols', async () => {
        expect(await validateWebhookUrl('ftp://example.com')).toBe(false);
        expect(await validateWebhookUrl('file:///etc/passwd')).toBe(false);
        expect(await validateWebhookUrl('javascript:alert(1)')).toBe(false);
    });

    it('should reject private IP addresses (IPv4)', async () => {
        expect(await validateWebhookUrl('http://127.0.0.1')).toBe(false);
        expect(await validateWebhookUrl('http://localhost')).toBe(false);
        expect(await validateWebhookUrl('http://10.0.0.5')).toBe(false);
        expect(await validateWebhookUrl('http://192.168.1.1')).toBe(false);
        expect(await validateWebhookUrl('http://172.16.0.1')).toBe(false);
    });

    // Note: Resolving public domains to check if they point to private IPs requires mocking DNS.
    // For this basic test, we assume the helper works as intended for direct IP checks.

    it('should reject invalid URLs', async () => {
        expect(await validateWebhookUrl('not-a-url')).toBe(false);
    });
});
