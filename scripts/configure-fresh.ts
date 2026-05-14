import { writeEnv, generateSecret } from './lib/env-writer.js';
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

    const env: Record<string, string> = {};

    // Database
    env.DB_HOST = await ask('Database host', 'localhost');
    env.DB_PORT = await ask('Database port', '5433');
    env.DB_USER = await ask('Database user', 'postgres');
    env.DB_PASSWORD = await ask('Database password', generateSecret(16));
    env.DB_NAME = await ask('Database name', 'whatsapp_gateway');
    env.DATABASE_URL = `postgres://${env.DB_USER}:${env.DB_PASSWORD}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`;

    // Redis
    env.REDIS_HOST = await ask('Redis host', 'localhost');
    env.REDIS_PORT = await ask('Redis port', '6379');
    env.REDIS_PASSWORD = await ask('Redis password', generateSecret(16));

    // Admin credentials
    env.ADMIN_USERNAME = await ask('Admin username', 'admin');
    const adminPw = await ask('Admin password (leave blank to auto-generate)');
    const finalAdminPw = adminPw || generateSecret(12);
    if (!adminPw) {
        console.log(`\n  Auto-generated admin password: ${finalAdminPw}\n`);
    }
    env.ADMIN_PASSWORD_HASH = bcrypt.hashSync(finalAdminPw, 12);

    // Secrets
    env.JWT_SECRET = generateSecret(32);
    env.WEBHOOK_SIGNING_SECRET = generateSecret(32);

    const masterKey = generateSecret(32);
    env.MASTER_API_KEY = masterKey;
    env.MASTER_API_KEY_HASH = bcrypt.hashSync(masterKey, 12);

    // Deployment
    env.PORT = await ask('Server port', '3000');
    env.NODE_ENV = await ask('Node environment', 'development');
    env.TRUST_PROXY = await ask('Trust proxy', 'loopback');
    env.CORS_ORIGINS = await ask(
        'CORS origins (comma separated, blank for dev)',
        '',
    );
    env.LOG_LEVEL = await ask('Log level', 'info');

    writeEnv(env);

    console.log('\n=== Fresh configuration saved to .env ===');
    console.log(`Admin username: ${env.ADMIN_USERNAME}`);
    console.log(`Master API key: ${masterKey}`);
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
