import pool from '../config/database.js';

export interface ApiKeyRecord {
    id: string;
    name: string;
    prefix: string;
    key_hash: string;
    full_key: string | null;
    created_at: Date;
    last_used_at: Date | null;
    revoked_at: Date | null;
    created_by: string;
}

export class ApiKeyRepository {
    async findById(id: string): Promise<ApiKeyRecord | undefined> {
        const { rows } = await pool.query(
            'SELECT * FROM api_keys WHERE id = $1',
            [id],
        );
        return rows[0];
    }

    async findByHash(keyHash: string): Promise<ApiKeyRecord | undefined> {
        const { rows } = await pool.query(
            'SELECT * FROM api_keys WHERE key_hash = $1',
            [keyHash],
        );
        return rows[0];
    }

    async findByPrefix(prefix: string): Promise<ApiKeyRecord | undefined> {
        const { rows } = await pool.query(
            'SELECT * FROM api_keys WHERE prefix = $1',
            [prefix],
        );
        return rows[0];
    }

    async findAll(): Promise<ApiKeyRecord[]> {
        const { rows } = await pool.query(
            'SELECT * FROM api_keys ORDER BY created_at DESC',
        );
        return rows;
    }

    async findAllActive(): Promise<ApiKeyRecord[]> {
        const { rows } = await pool.query(
            'SELECT * FROM api_keys WHERE revoked_at IS NULL ORDER BY created_at DESC',
        );
        return rows;
    }

    async create(data: {
        name: string;
        prefix: string;
        keyHash: string;
        fullKey: string;
        createdBy: string;
    }): Promise<string> {
        const { rows } = await pool.query(
            'INSERT INTO api_keys (name, prefix, key_hash, full_key, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [
                data.name,
                data.prefix,
                data.keyHash,
                data.fullKey,
                data.createdBy,
            ],
        );
        return rows[0].id;
    }

    async updateLastUsedAt(id: string): Promise<void> {
        await pool.query(
            'UPDATE api_keys SET last_used_at = current_timestamp WHERE id = $1',
            [id],
        );
    }

    async updateFullKey(
        id: string,
        fullKey: string,
        keyHash: string,
    ): Promise<void> {
        await pool.query(
            'UPDATE api_keys SET full_key = $1, key_hash = $2 WHERE id = $3',
            [fullKey, keyHash, id],
        );
    }

    async revoke(id: string): Promise<void> {
        await pool.query(
            'UPDATE api_keys SET revoked_at = current_timestamp WHERE id = $1',
            [id],
        );
    }

    async delete(id: string): Promise<void> {
        await pool.query('DELETE FROM api_keys WHERE id = $1', [id]);
    }
}
