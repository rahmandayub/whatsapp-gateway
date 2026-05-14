import crypto from 'crypto';

const KEY_ENCRYPTION_SECRET = process.env.KEY_ENCRYPTION_SECRET;

function getKey(): Buffer {
    if (!KEY_ENCRYPTION_SECRET) {
        throw new Error('KEY_ENCRYPTION_SECRET is not set');
    }
    if (!/^[a-f0-9]{64}$/i.test(KEY_ENCRYPTION_SECRET)) {
        throw new Error('KEY_ENCRYPTION_SECRET must be a 64-character hex string');
    }
    return Buffer.from(KEY_ENCRYPTION_SECRET, 'hex');
}

export function encrypt(plaintext: string): string {
    const key = getKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext}`;
}

export function decrypt(ciphertext: string): string {
    const key = getKey();
    const parts = ciphertext.split(':');
    if (parts.length !== 4 || parts[0] !== 'v1') {
        throw new Error('Invalid encrypted key format');
    }
    const iv = Buffer.from(parts[1], 'base64');
    const tag = Buffer.from(parts[2], 'base64');
    const encrypted = parts[3];
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    let plaintext = decipher.update(encrypted, 'base64', 'utf8');
    plaintext += decipher.final('utf8');
    return plaintext;
}
