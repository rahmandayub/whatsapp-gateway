import { readExistingEnv, writeEnv, generateSecret } from './lib/env-writer.js';
import {
    runDockerCompose,
    waitForPostgres,
    runMigrations,
} from './lib/docker.js';
import bcrypt from 'bcrypt';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function ask(question: string, defaultValue?: string): Promise<string> {
    return new Promise((resolve) => {
        const prompt = defaultValue
            ? `${question} [${defaultValue}]: `
            : `${question}: `;
        rl.question(prompt, (answer) => {
            resolve(answer.trim() || defaultValue || '');
        });
    });
}

async function main() {
    console.log('\n=== WhatsApp Gateway Configuration ===\n');

    const existing = readExistingEnv();
    const env: Record<string, string> = { ...existing };

    // Database
    env.DB_HOST = await ask('Database host', existing.DB_HOST || 'localhost');
    env.DB_PORT = await ask('Database port', existing.DB_PORT || '5433');
    env.DB_USER = await ask('Database user', existing.DB_USER || 'postgres');
    env.DB_PASSWORD = await ask(
        'Database password',
        existing.DB_PASSWORD || generateSecret(16),
    );
    env.DB_NAME = await ask(
        'Database name',
        existing.DB_NAME || 'whatsapp_gateway',
    );
    env.DATABASE_URL = `postgres://${env.DB_USER}:${env.DB_PASSWORD}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`;

    // Redis
    env.REDIS_HOST = await ask(
        'Redis host',
        existing.REDIS_HOST || 'localhost',
    );
    env.REDIS_PORT = await ask('Redis port', existing.REDIS_PORT || '6379');
    env.REDIS_PASSWORD = await ask(
        'Redis password',
        existing.REDIS_PASSWORD || generateSecret(16),
    );

    // Admin credentials
    env.ADMIN_USERNAME = await ask(
        'Admin username',
        existing.ADMIN_USERNAME || 'admin',
    );
    const adminPw = await ask('Admin password (leave blank to auto-generate)');
    const finalAdminPw = adminPw || generateSecret(12);
    if (!adminPw) {
        console.log(`\n  Auto-generated admin password: ${finalAdminPw}\n`);
    }
    env.ADMIN_PASSWORD_HASH = bcrypt.hashSync(finalAdminPw, 12);

    // Secrets
    env.JWT_SECRET = existing.JWT_SECRET || generateSecret(32);
    env.WEBHOOK_SIGNING_SECRET =
        existing.WEBHOOK_SIGNING_SECRET || generateSecret(32);

    const masterKey = generateSecret(32);
    env.MASTER_API_KEY = masterKey;
    env.MASTER_API_KEY_HASH = bcrypt.hashSync(masterKey, 12);

    // Deployment
    env.PORT = await ask('Server port', existing.PORT || '3000');
    env.NODE_ENV = await ask(
        'Node environment',
        existing.NODE_ENV || 'development',
    );
    env.TRUST_PROXY = await ask(
        'Trust proxy',
        existing.TRUST_PROXY || 'loopback',
    );
    env.CORS_ORIGINS = await ask(
        'CORS origins (comma separated, blank for dev)',
        existing.CORS_ORIGINS || '',
    );
    env.LOG_LEVEL = await ask('Log level', existing.LOG_LEVEL || 'info');

    writeEnv(env);

    console.log('\n=== Configuration saved to .env ===');
    console.log(`Admin username: ${env.ADMIN_USERNAME}`);
    console.log(`Master API key: ${masterKey}`);
    console.log(
        '\nKeep these credentials secure. They are not stored elsewhere.\n',
    );

    const startDocker = await ask(
        'Start / restart Docker infrastructure now? (y/n)',
        'y',
    );
    if (
        startDocker.toLowerCase() === 'y' ||
        startDocker.toLowerCase() === 'yes'
    ) {
        runDockerCompose();
        waitForPostgres(env.DB_HOST, env.DB_PORT);
        runMigrations();
        console.log('\n=== Setup complete ===');
        console.log('Run "npm run backend:dev" to start the server.\n');
    }

    rl.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
