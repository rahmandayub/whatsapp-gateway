import { writeEnv, generateSecret, EnvEntry } from './lib/env-writer.js';
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
    console.log('\n=== Fresh WhatsApp Gateway Configuration ===');
    console.log('WARNING: This will overwrite your existing .env file.\n');

    const confirm = await ask('Type "yes" to continue');
    if (confirm.toLowerCase() !== 'yes') {
        console.log('Aborted.');
        rl.close();
        return;
    }

    // Database
    const dbHost = await ask('Database host', 'localhost');
    const dbPort = await ask('Database port', '5433');
    const dbUser = await ask('Database user', 'postgres');
    const dbPassword = await ask('Database password', generateSecret(16));
    const dbName = await ask('Database name', 'whatsapp_gateway');

    // Redis
    const redisHost = await ask('Redis host', 'localhost');
    const redisPort = await ask('Redis port', '6379');
    const redisPassword = await ask('Redis password', generateSecret(16));

    // Admin credentials
    const adminUsername = await ask('Admin username', 'admin');
    const adminPw = await ask('Admin password (leave blank to auto-generate)');
    const finalAdminPw = adminPw || generateSecret(12);
    if (!adminPw) {
        console.log(`\n  Auto-generated admin password: ${finalAdminPw}\n`);
    }
    const adminPasswordHash = bcrypt.hashSync(finalAdminPw, 12);

    // Secrets
    const jwtSecret = generateSecret(32);
    const webhookSigningSecret = generateSecret(32);
    const keyEncryptionSecret = generateSecret(32);

    // Deployment
    const port = await ask('Server port', '3000');
    const nodeEnv = await ask('Node environment', 'development');
    const trustProxy = await ask('Trust proxy', 'loopback');
    const corsOrigins = await ask(
        'CORS origins (comma separated, blank for dev)',
        '',
    );
    const logLevel = await ask('Log level', 'info');

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
        { key: 'WEBHOOK_ALLOW_HTTP', value: 'false' },
        { blankLine: true, key: '', value: '' },
        { comment: 'Security / Deployment', key: '', value: '' },
        { key: 'NODE_ENV', value: nodeEnv },
        { key: 'TRUST_PROXY', value: trustProxy },
        { key: 'CORS_ORIGINS', value: corsOrigins },
        { blankLine: true, key: '', value: '' },
        { comment: 'Endpoint access control', key: '', value: '' },
        { key: 'METRICS_PUBLIC', value: 'false' },
        { key: 'METRICS_TOKEN', value: generateSecret(16) },
        { key: 'DOCS_PUBLIC', value: 'false' },
    ];

    writeEnv(entries);

    console.log('\n=== Fresh configuration saved to .env ===');
    console.log(`Admin username: ${adminUsername}`);
    console.log(
        '\nKeep these credentials secure. They are not stored elsewhere.\n',
    );

    const startDocker = await ask(
        'Start Docker infrastructure now? (y/n)',
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
