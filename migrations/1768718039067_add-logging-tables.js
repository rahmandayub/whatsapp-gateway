/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
    // message_logs
    pgm.createTable('message_logs', {
        id: 'id',
        session_id: {
            type: 'varchar(255)',
            notNull: true,
            references: '"sessions"',
            onDelete: 'CASCADE',
        },
        direction: { type: 'varchar(10)', notNull: true }, // 'incoming' | 'outgoing'
        message_id: { type: 'varchar(255)' },
        recipient: { type: 'varchar(255)' }, // remoteJid
        message_type: { type: 'varchar(50)' },
        content_preview: { type: 'text' },
        status: { type: 'varchar(50)' },
        timestamp: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
    });
    pgm.createIndex('message_logs', 'session_id');
    pgm.createIndex('message_logs', 'timestamp');

    // webhook_deliveries
    pgm.createTable('webhook_deliveries', {
        id: 'id',
        session_id: { type: 'varchar(255)', notNull: true },
        webhook_url: { type: 'text', notNull: true },
        event_type: { type: 'varchar(100)', notNull: true },
        payload: { type: 'jsonb' },
        status: { type: 'varchar(50)' }, // 'pending' | 'delivered' | 'failed'
        attempts: { type: 'integer', default: 0 },
        last_attempt_at: { type: 'timestamp' },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
    });
    pgm.createIndex('webhook_deliveries', 'session_id');

    // session_events
    pgm.createTable('session_events', {
        id: 'id',
        session_id: { type: 'varchar(255)', notNull: true },
        event_type: { type: 'varchar(100)', notNull: true },
        details: { type: 'jsonb' },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
    });
    pgm.createIndex('session_events', 'session_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable('session_events');
    pgm.dropTable('webhook_deliveries');
    pgm.dropTable('message_logs');
};
