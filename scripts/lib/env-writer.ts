import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface EnvValues {
    [key: string]: string;
}

export function readExistingEnv(): EnvValues {
    const envPath = path.resolve(process.cwd(), '.env');
    const values: EnvValues = {};
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split('\n')) {
            const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
            if (match) {
                // Unescape Docker Compose $$ -> $ so re-writes don't double-escape
                values[match[1]] = match[2].replace(/\$\$/g, '$');
            }
        }
    }
    return values;
}

export function writeEnv(values: EnvValues): void {
    const envPath = path.resolve(process.cwd(), '.env');
    const lines: string[] = [];
    for (const [key, value] of Object.entries(values)) {
        // Escape $ as $$ so Docker Compose doesn't treat it as variable interpolation
        const escaped = value.replace(/\$/g, '$$$$');
        lines.push(`${key}=${escaped}`);
    }
    fs.writeFileSync(envPath, lines.join('\n') + '\n', 'utf8');
}

export function generateSecret(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
}
