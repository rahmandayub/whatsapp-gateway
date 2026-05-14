import {
    readExistingEnv,
    writeEnv,
    generateSecret,
    EnvEntry,
} from './lib/env-writer.js';
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

    // Database
    const dbHost = await ask('Database host', existing.DB_HOST || 'localhost');
    const dbPort = await ask('Database port', existing.DB_PORT || '5433');
    const dbUser = await ask('Database user', existing.DB_USER || 'postgres');
    const dbPassword = await ask(
        'Database password',
        existing.DB_PASSWORD || generateSecret(16),
    );
    const dbName = await ask(
        'Database name',
        existing.DB_NAME || 'whatsapp_gateway',
    );

    // Redis
    const redisHost = await ask(
        'Redis host',
        existing.REDIS_HOST || 'localhost',
    );
    const redisPort = await ask('Redis port', existing.REDIS_PORT || '6379');
    const redisPassword = await ask(
        'Redis password',
        existing.REDIS_PASSWORD || generateSecret(16),
    );

    // Admin credentials
    const adminUsername = await ask(
        'Admin username',
        existing.ADMIN_USERNAME || 'admin',
    );
    const adminPw = await ask('Admin password (leave blank to auto-generate)');
    const finalAdminPw = adminPw || generateSecret(12);
    if (!adminPw) {
        console.log(`\n  Auto-generated admin password: ${finalAdminPw}\n`);
    }
    const adminPasswordHash = bcrypt.hashSync(finalAdminPw, 12);

    // Secrets
    const jwtSecret = existing.JWT_SECRET || generateSecret(32);
    const webhookSigningSecret =
        existing.WEBHOOK_SIGNING_SECRET || generateSecret(32);
    const keyEncryptionSecret =
        existing.KEY_ENCRYPTION_SECRET || generateSecret(32);

    // Deployment
    const port = await ask('Server port', existing.PORT || '3000');
    const nodeEnv = await ask(
        'Node environment',
        existing.NODE_ENV || 'development',
    );
    const trustProxy = await ask(
        'Trust proxy',
        existing.TRUST_PROXY || 'loopback',
    );
    const corsOrigins = await ask(
        'CORS origins (comma separated, blank for dev)',
        existing.CORS_ORIGINS || '',
    );
    const logLevel = await ask('Log level', existing.LOG_LEVEL || 'info');

    const entries: EnvEntry[] = [
        {
            comment: 'Generate secrets with: openssl rand -hex 32',
            key: '',
            value: '',
        },
        {
            comment:
                'For KEY_ENCRYPTION_SECRET, you MUST use exactly 64 hex characters.',
            key: '',
            value: '',
        },
        { blankLine: true, key: '', value: '' },
        { key: 'PORT', value: port },
        { key: 'DB_USER', value: dbUser },
        { key: 'DB_PASSWORD', value: dbPassword },
        { key: 'DB_NAME', value: dbName },
        { key: 'DB_PORT', value: dbPort },
        { key: 'DB_HOST', value: dbHost },
        { key: 'REDIS_HOST', value: redisHost },
        { key: 'REDIS_PORT', value: redisPort },
        { key: 'REDIS_PASSWORD', value: redisPassword },
        { key: 'LOG_LEVEL', value: logLevel },
        {
            key: 'DATABASE_URL',
            value: `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`,
        },
        { blankLine: true, key: '', value: '' },
        { comment: 'Admin credentials', key: '', value: '' },
        { key: 'ADMIN_USERNAME', value: adminUsername },
        { key: 'ADMIN_PASSWORD_HASH', value: adminPasswordHash },
        { key: 'JWT_SECRET', value: jwtSecret },
        { blankLine: true, key: '', value: '' },
        {
            comment: 'API key encryption (64 hex chars = 32 bytes)',
            key: '',
            value: '',
        },
        { key: 'KEY_ENCRYPTION_SECRET', value: keyEncryptionSecret },
        { blankLine: true, key: '', value: '' },
        { comment: 'Webhook signing', key: '', value: '' },
        { key: 'WEBHOOK_SIGNING_SECRET', value: webhookSigningSecret },
        { blankLine: true, key: '', value: '' },
        { comment: 'Webhook security', key: '', value: '' },
        {
            key: 'WEBHOOK_ALLOW_HTTP',
            value: existing.WEBHOOK_ALLOW_HTTP || 'false',
        },
        { blankLine: true, key: '', value: '' },
        { comment: 'Security / Deployment', key: '', value: '' },
        { key: 'NODE_ENV', value: nodeEnv },
        { key: 'TRUST_PROXY', value: trustProxy },
        { key: 'CORS_ORIGINS', value: corsOrigins },
        { blankLine: true, key: '', value: '' },
        { comment: 'Endpoint access control', key: '', value: '' },
        { key: 'METRICS_PUBLIC', value: existing.METRICS_PUBLIC || 'false' },
        {
            key: 'METRICS_TOKEN',
            value: existing.METRICS_TOKEN || generateSecret(16),
        },
        { key: 'DOCS_PUBLIC', value: existing.DOCS_PUBLIC || 'false' },
    ];

    writeEnv(entries);

    console.log('\n=== Configuration saved to .env ===');
    console.log(`Admin username: ${adminUsername}`);
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
        waitForPostgres(dbHost, dbPort);
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
