import pool from '../config/database.js';

export class SessionRepository {
    async findById(sessionId: string) {
        const query = 'SELECT * FROM sessions WHERE session_id = $1';
        const { rows } = await pool.query(query, [sessionId]);
        return rows[0];
    }

    async create(sessionId: string, webhookUrl: string | null) {
        const query =
            'INSERT INTO sessions (session_id, webhook_url, status) VALUES ($1, $2, $3)';
        await pool.query(query, [sessionId, webhookUrl, 'CONNECTING']);
    }

    async updateStatus(sessionId: string, status: string, whatsappId?: string) {
        if (whatsappId) {
            await pool.query(
                'UPDATE sessions SET status = $1, whatsapp_id = $2 WHERE session_id = $3',
                [status, whatsappId, sessionId],
            );
        } else {
            await pool.query(
                'UPDATE sessions SET status = $1 WHERE session_id = $2',
                [status, sessionId],
            );
        }
    }

    async delete(sessionId: string) {
        await pool.query('DELETE FROM sessions WHERE session_id = $1', [
            sessionId,
        ]);
    }

    async findAll() {
        const result = await pool.query(
            'SELECT session_id, status, whatsapp_id, webhook_url FROM sessions ORDER BY created_at DESC',
        );
        return result.rows;
    }

    async findActiveSessions() {
        const query =
            "SELECT * FROM sessions WHERE status != 'STOPPED' AND status != 'STOPPED_ERROR'";
        const { rows } = await pool.query(query);
        return rows;
    }
}
