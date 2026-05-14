import { URL } from 'url';
import dns from 'dns';
import util from 'util';

const lookup = util.promisify(dns.lookup);
const WEBHOOK_ALLOW_HTTP = process.env.WEBHOOK_ALLOW_HTTP === 'true';

export const validateWebhookUrl = async (url: string): Promise<boolean> => {
    try {
        const parsedUrl = new URL(url);

        // 1. Check protocol
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return false;
        }

        // Block HTTP unless explicitly allowed
        if (parsedUrl.protocol === 'http:' && !WEBHOOK_ALLOW_HTTP) {
            return false;
        }

        // 2. Check for private IPs (SSRF protection)
        const hostname = parsedUrl.hostname;

        // If it's an IP address, check directly
        if (isPrivateIp(hostname)) {
            return false;
        }

        // Resolve hostname to IP to check for DNS rebinding/internal resolution
        try {
            const { address } = await lookup(hostname);
            if (isPrivateIp(address)) {
                return false;
            }
        } catch {
            // DNS lookup failed - invalid domain
            return false;
        }

        return true;
    } catch {
        // Invalid URL format
        return false;
    }
};

export const isPrivateIp = (ip: string): boolean => {
    if (ip === 'localhost') return true;

    // IPv4 checks
    // 0.0.0.0/8 (including 0.0.0.0)
    if (ip.startsWith('0.')) return true;

    // 127.0.0.0/8
    if (ip.startsWith('127.')) return true;

    // 10.0.0.0/8
    if (ip.startsWith('10.')) return true;

    // 100.64.0.0/10 (CGNAT)
    if (ip.startsWith('100.')) {
        const parts = ip.split('.');
        if (parts.length > 1) {
            const second = parseInt(parts[1]);
            if (second >= 64 && second <= 127) return true;
        }
    }

    // 169.254.0.0/16 (Link-local)
    if (ip.startsWith('169.254.')) return true;

    // 172.16.0.0/12 (172.16 - 172.31)
    if (ip.startsWith('172.')) {
        const parts = ip.split('.');
        if (parts.length > 1) {
            const second = parseInt(parts[1]);
            if (second >= 16 && second <= 31) return true;
        }
    }

    // 192.168.0.0/16
    if (ip.startsWith('192.168.')) return true;

    // Broadcast
    if (ip === '255.255.255.255') return true;

    // IPv4-mapped IPv6 addresses (::ffff:127.0.0.1 etc)
    if (ip.toLowerCase().startsWith('::ffff:')) {
        const ipv4 = ip.slice(7);
        return isPrivateIp(ipv4);
    }

    // IPv6 checks
    if (ip === '::' || ip === '::1') return true; // Unspecified + loopback
    const lowerIp = ip.toLowerCase();
    if (lowerIp.startsWith('fc') || lowerIp.startsWith('fd')) return true; // Unique Local Address
    if (lowerIp.startsWith('fe80')) return true; // Link-local

    return false;
};
