import { describe, it, expect, vi, afterEach } from 'vitest';
import path from 'path';

describe('Config Paths', () => {

    afterEach(() => {
        vi.resetModules();
        delete process.env.AUTH_DIR;
    });

    it('should use default AUTH_DIR if not set', async () => {
        const { CONFIG } = await import('../../config/paths.js');
        expect(CONFIG.AUTH_DIR).toBe(path.resolve(process.cwd(), 'auth_info_baileys'));
    });

    it('should use configured AUTH_DIR if set', async () => {
        process.env.AUTH_DIR = './custom_auth';
        const { CONFIG } = await import('../../config/paths.js');
        expect(CONFIG.AUTH_DIR).toBe(path.resolve(process.cwd(), 'custom_auth'));
    });

    it('should validate secure paths', async () => {
        const { CONFIG } = await import('../../config/paths.js');
        const publicPath = path.resolve(process.cwd(), 'public/sensitive');
        const safePath = path.resolve(process.cwd(), 'data/sensitive');

        expect(CONFIG.isPathSecure(publicPath)).toBe(false);
        expect(CONFIG.isPathSecure(safePath)).toBe(true);
    });
});
