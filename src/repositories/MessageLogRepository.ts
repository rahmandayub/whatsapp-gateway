import pool from '../config/database.js';

interface MessageLog {
    id?: number;
    session_id: string;
    direction: 'incoming' | 'outgoing';
    message_id?: string;
    recipient?: string;
    message_type?: string;
    content_preview?: string;
    status?: string;
    timestamp?: Date;
}

export class MessageLogRepository {
    async create(data: MessageLog): Promise<void> {
        const query = `
            INSERT INTO message_logs (
                session_id, direction, message_id, recipient, message_type, content_preview, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        const values = [
            data.session_id,
            data.direction,
            data.message_id,
            data.recipient,
            data.message_type,
            data.content_preview,
            data.status
        ];

        await pool.query(query, values);
    }

    async findBySessionId(sessionId: string, limit = 50, offset = 0): Promise<MessageLog[]> {
        const query = `
            SELECT * FROM message_logs
            WHERE session_id = $1
            ORDER BY timestamp DESC
            LIMIT $2 OFFSET $3
        `;
        const { rows } = await pool.query(query, [sessionId, limit, offset]);
        return rows;
    }
}
