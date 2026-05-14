import pool from '../config/database.js';

export interface AuditLogInput {
  actorType: string;
  actorId: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  ip?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AuditLogRecord {
  id: string;
  actor_type: string;
  actor_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  ip: string | null;
  request_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

export class AuditLogRepository {
  async create(data: AuditLogInput): Promise<void> {
    await pool.query(
      `INSERT INTO audit_logs (actor_type, actor_id, action, target_type, target_id, ip, request_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        data.actorType,
        data.actorId,
        data.action,
        data.targetType ?? null,
        data.targetId ?? null,
        data.ip ?? null,
        data.requestId ?? null,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );
  }

  async findRecent(limit = 100, offset = 0): Promise<AuditLogRecord[]> {
    const { rows } = await pool.query(
      `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows;
  }
}
