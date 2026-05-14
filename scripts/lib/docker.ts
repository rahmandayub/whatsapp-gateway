import { execSync } from 'child_process';

export function runDockerCompose(preserveVolumes = false): void {
    console.log('\n--- Docker Compose ---');
    const downCmd = preserveVolumes
        ? 'docker compose down'
        : 'docker compose down -v';
    try {
        execSync(downCmd, { cwd: process.cwd(), stdio: 'inherit' });
    } catch {
        // ignore errors if nothing was running
    }
    execSync('docker compose up -d --build', {
        cwd: process.cwd(),
        stdio: 'inherit',
    });
    console.log('Docker infrastructure is starting...');
}

export function waitForPostgres(
    host: string,
    port: string,
    maxRetries = 15,
): void {
    console.log(`Waiting for PostgreSQL at ${host}:${port}...`);
    for (let i = 0; i < maxRetries; i++) {
        try {
            execSync(`pg_isready -h ${host} -p ${port}`, {
                cwd: process.cwd(),
                stdio: 'pipe',
            });
            console.log('PostgreSQL is ready.');
            return;
        } catch {
            // not ready yet
        }
        execSync('sleep 1', { stdio: 'pipe' });
    }
    console.warn('PostgreSQL did not become ready in time; continuing anyway.');
}

export function runMigrations(): void {
    console.log('\n--- Database Migrations ---');
    try {
        execSync('npm run migrate:up', {
            cwd: process.cwd(),
            stdio: 'inherit',
            env: process.env,
        });
        console.log('Migrations completed.');
    } catch (err) {
        console.error('Migration failed:', err);
        throw err;
    }
}
