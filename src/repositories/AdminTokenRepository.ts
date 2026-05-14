import pool from '../config/database.js';

export interface AdminTokenRecord {
    id: string;
    name: string;
    prefix: string;
    key_hash: string;
    created_at: Date;
    last_used_at: Date | null;
    revoked_at: Date | null;
    expires_at: Date | null;
    created_by: string;
}

export class AdminTokenRepository {
    async findById(id: string): Promise<AdminTokenRecord | undefined> {
        const { rows } = await pool.query(
            'SELECT * FROM admin_tokens WHERE id = $1',
            [id],
        );
        return rows[0];
    }

    async findByHash(keyHash: string): Promise<AdminTokenRecord | undefined> {
        const { rows } = await pool.query(
            'SELECT id, name, prefix, key_hash, created_at, last_used_at, revoked_at, expires_at, created_by FROM admin_tokens WHERE key_hash = $1',
            [keyHash],
        );
        return rows[0];
    }

    async findByPrefix(prefix: string): Promise<AdminTokenRecord | undefined> {
        const { rows } = await pool.query(
            'SELECT * FROM admin_tokens WHERE prefix = $1',
            [prefix],
        );
        return rows[0];
    }

    async findAll(): Promise<AdminTokenRecord[]> {
        const { rows } = await pool.query(
            'SELECT * FROM admin_tokens ORDER BY created_at DESC',
        );
        return rows;
    }

    async findAllActive(): Promise<AdminTokenRecord[]> {
        const { rows } = await pool.query(
            'SELECT * FROM admin_tokens WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > current_timestamp) ORDER BY created_at DESC',
        );
        return rows;
    }

    async create(data: {
        name: string;
        prefix: string;
        keyHash: string;
        createdBy: string;
        expiresAt?: Date | null;
    }): Promise<string> {
        const { rows } = await pool.query(
            'INSERT INTO admin_tokens (name, prefix, key_hash, created_by, expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [data.name, data.prefix, data.keyHash, data.createdBy, data.expiresAt ?? null],
        );
        return rows[0].id;
    }

    async updateLastUsedAt(id: string): Promise<void> {
        await pool.query(
            'UPDATE admin_tokens SET last_used_at = current_timestamp WHERE id = $1',
            [id],
        );
    }

    async rotate(
        id: string,
        prefix: string,
        keyHash: string,
    ): Promise<void> {
        await pool.query(
            'UPDATE admin_tokens SET prefix = $1, key_hash = $2, last_used_at = NULL WHERE id = $3',
            [prefix, keyHash, id],
        );
    }

    async revoke(id: string): Promise<void> {
        await pool.query(
            'UPDATE admin_tokens SET revoked_at = current_timestamp WHERE id = $1',
            [id],
        );
    }

    async delete(id: string): Promise<void> {
        await pool.query('DELETE FROM admin_tokens WHERE id = $1', [id]);
    }
}
