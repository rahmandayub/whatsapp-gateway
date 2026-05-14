import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface EnvEntry {
    key: string;
    value: string;
    comment?: string;
    blankLine?: boolean;
}

export type EnvValues = Record<string, string>;

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

export function writeEnv(entries: EnvEntry[]): void {
    const envPath = path.resolve(process.cwd(), '.env');
    const lines: string[] = [];
    for (const entry of entries) {
        if (entry.comment) {
            lines.push(`# ${entry.comment}`);
        }
        if (entry.key) {
            // Escape $ as $$ so Docker Compose doesn't treat it as variable interpolation
            const escaped = entry.value.replace(/\$/g, '$$$$');
            lines.push(`${entry.key}=${escaped}`);
        }
        if (entry.blankLine) {
            lines.push('');
        }
    }
    fs.writeFileSync(envPath, lines.join('\n') + '\n', 'utf8');
}

export function generateSecret(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
}
