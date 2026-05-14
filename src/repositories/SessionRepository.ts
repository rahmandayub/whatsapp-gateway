import pool from '../config/database.js';

export interface SessionRecord {
    id: string;
    api_key_id: string;
    name: string;
    webhook_url: string | null;
    status: string;
    whatsapp_id: string | null;
    created_at: Date;
    updated_at: Date;
}

export class SessionRepository {
    async findById(id: string): Promise<SessionRecord | undefined> {
        const { rows } = await pool.query(
            'SELECT * FROM sessions WHERE id = $1',
            [id],
        );
        return rows[0];
    }

    async findByIdAndApiKey(
        id: string,
        apiKeyId: string,
    ): Promise<SessionRecord | undefined> {
        const { rows } = await pool.query(
            'SELECT * FROM sessions WHERE id = $1 AND api_key_id = $2',
            [id, apiKeyId],
        );
        return rows[0];
    }

    async findByNameAndApiKey(
        name: string,
        apiKeyId: string,
    ): Promise<SessionRecord | undefined> {
        const { rows } = await pool.query(
            'SELECT * FROM sessions WHERE name = $1 AND api_key_id = $2',
            [name, apiKeyId],
        );
        return rows[0];
    }

    async create(data: {
        apiKeyId: string;
        name: string;
        webhookUrl?: string | null;
    }): Promise<string> {
        const { rows } = await pool.query(
            'INSERT INTO sessions (api_key_id, name, webhook_url, status) VALUES ($1, $2, $3, $4) RETURNING id',
            [data.apiKeyId, data.name, data.webhookUrl ?? null, 'CONNECTING'],
        );
        return rows[0].id;
    }

    async updateStatus(id: string, status: string, whatsappId?: string) {
        if (whatsappId) {
            await pool.query(
                'UPDATE sessions SET status = $1, whatsapp_id = $2, updated_at = current_timestamp WHERE id = $3',
                [status, whatsappId, id],
            );
        } else {
            await pool.query(
                'UPDATE sessions SET status = $1, updated_at = current_timestamp WHERE id = $2',
                [status, id],
            );
        }
    }

    async updateWebhookUrl(id: string, webhookUrl: string | null) {
        await pool.query(
            'UPDATE sessions SET webhook_url = $1, updated_at = current_timestamp WHERE id = $2',
            [webhookUrl, id],
        );
    }

    async delete(id: string) {
        await pool.query('DELETE FROM sessions WHERE id = $1', [id]);
    }

    async findAll(): Promise<SessionRecord[]> {
        const result = await pool.query(
            'SELECT * FROM sessions ORDER BY created_at DESC',
        );
        return result.rows;
    }

    async findByApiKey(apiKeyId: string): Promise<SessionRecord[]> {
        const result = await pool.query(
            'SELECT * FROM sessions WHERE api_key_id = $1 ORDER BY created_at DESC',
            [apiKeyId],
        );
        return result.rows;
    }

    async findActiveSessions(): Promise<SessionRecord[]> {
        const { rows } = await pool.query(
            "SELECT * FROM sessions WHERE status != 'STOPPED' AND status != 'STOPPED_ERROR'",
        );
        return rows;
    }
}
