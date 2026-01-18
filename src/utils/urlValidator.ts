import { URL } from 'url';
import dns from 'dns';
import util from 'util';

const lookup = util.promisify(dns.lookup);

export const validateWebhookUrl = async (url: string): Promise<boolean> => {
    try {
        const parsedUrl = new URL(url);

        // 1. Check protocol
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return false;
        }

        // 2. Check for private IPs (SSRF protection)
        const hostname = parsedUrl.hostname;

        // If it's an IP address, check directly
        if (isPrivateIp(hostname)) {
            return false;
        }

        // Resolve hostname to IP to check for DNS rebinding/internal resolution
        // Note: This is a basic check. For high security, we'd need to use a dedicated library or proxy.
        // But preventing localhost/127.0.0.1/192.168.x.x is the goal.
        try {
            const { address } = await lookup(hostname);
            if (isPrivateIp(address)) {
                return false;
            }
        } catch (e) {
            // DNS lookup failed - invalid domain
            return false;
        }

        return true;
    } catch (e) {
        // Invalid URL format
        return false;
    }
};

const isPrivateIp = (ip: string): boolean => {
    // IPv4 checks
    if (ip === 'localhost') return true;

    // 127.0.0.0/8
    if (ip.startsWith('127.')) return true;

    // 10.0.0.0/8
    if (ip.startsWith('10.')) return true;

    // 192.168.0.0/16
    if (ip.startsWith('192.168.')) return true;

    // 172.16.0.0/12 (172.16 - 172.31)
    if (ip.startsWith('172.')) {
        const parts = ip.split('.');
        if (parts.length > 1) {
            const second = parseInt(parts[1]);
            if (second >= 16 && second <= 31) return true;
        }
    }

    // 169.254.0.0/16 (Link-local)
    if (ip.startsWith('169.254.')) return true;

    // IPv6 checks (basic)
    if (ip === '::1') return true;
    if (ip.toLowerCase().startsWith('fc') || ip.toLowerCase().startsWith('fd')) return true; // Unique Local Address
    if (ip.toLowerCase().startsWith('fe80')) return true; // Link-local

    return false;
};
