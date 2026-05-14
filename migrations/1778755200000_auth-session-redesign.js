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
    // Create api_keys table
    pgm.createTable('api_keys', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },
        name: { type: 'varchar(255)', notNull: true },
        prefix: { type: 'varchar(64)', notNull: true, unique: true },
        key_hash: { type: 'text', notNull: true, unique: true },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
        last_used_at: { type: 'timestamp' },
        revoked_at: { type: 'timestamp' },
        created_by: { type: 'varchar(255)', default: 'system' },
    });

    // Recreate sessions with uuid PK and api_key_id FK
    // Drop old tables (CASCADE will drop constraints automatically)
    pgm.dropTable('sessions', { ifExists: true, cascade: true });
    pgm.dropTable('session_events', { ifExists: true, cascade: true });
    pgm.dropTable('webhook_deliveries', { ifExists: true, cascade: true });
    pgm.dropTable('message_logs', { ifExists: true, cascade: true });
    pgm.dropTable('templates', { ifExists: true, cascade: true });

    // Create new sessions
    pgm.createTable('sessions', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },
        api_key_id: {
            type: 'uuid',
            notNull: true,
            references: '"api_keys"',
            onDelete: 'CASCADE',
        },
        name: { type: 'varchar(255)', notNull: true },
        webhook_url: { type: 'text' },
        status: { type: 'varchar(50)', default: 'DISCONNECTED' },
        whatsapp_id: { type: 'varchar(50)' },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
        updated_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
    });

    // Unique name per api_key
    pgm.createConstraint('sessions', 'sessions_api_key_name_unique', {
        unique: ['api_key_id', 'name'],
    });

    // Templates
    pgm.createTable('templates', {
        id: 'id',
        name: { type: 'varchar(255)', notNull: true, unique: true },
        content: { type: 'text', notNull: true },
        language: { type: 'varchar(10)', default: 'en' },
        category: { type: 'varchar(50)' },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
        updated_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
    });

    // message_logs with UUID session_id
    pgm.createTable('message_logs', {
        id: 'id',
        session_id: {
            type: 'uuid',
            notNull: true,
            references: '"sessions"',
            onDelete: 'CASCADE',
        },
        direction: { type: 'varchar(10)', notNull: true },
        message_id: { type: 'varchar(255)' },
        recipient: { type: 'varchar(255)' },
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
        session_id: {
            type: 'uuid',
            notNull: true,
            references: '"sessions"',
            onDelete: 'CASCADE',
        },
        webhook_url: { type: 'text', notNull: true },
        event_type: { type: 'varchar(100)', notNull: true },
        payload: { type: 'jsonb' },
        status: { type: 'varchar(50)' },
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
        session_id: {
            type: 'uuid',
            notNull: true,
            references: '"sessions"',
            onDelete: 'CASCADE',
        },
        event_type: { type: 'varchar(100)', notNull: true },
        details: { type: 'jsonb' },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
    });
    pgm.createIndex('session_events', 'session_id');

    // audit_logs
    pgm.createTable('audit_logs', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },
        actor_type: { type: 'varchar(20)', notNull: true },
        actor_id: { type: 'text', notNull: true },
        action: { type: 'varchar(100)', notNull: true },
        target_type: { type: 'varchar(50)' },
        target_id: { type: 'text' },
        ip: { type: 'varchar(45)' },
        request_id: { type: 'varchar(255)' },
        metadata: { type: 'jsonb' },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
    });
    pgm.createIndex('audit_logs', 'actor_id');
    pgm.createIndex('audit_logs', 'action');
    pgm.createIndex('audit_logs', 'created_at');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable('audit_logs', { ifExists: true });
    pgm.dropTable('session_events', { ifExists: true });
    pgm.dropTable('webhook_deliveries', { ifExists: true });
    pgm.dropTable('message_logs', { ifExists: true });
    pgm.dropTable('templates', { ifExists: true });
    pgm.dropTable('sessions', { ifExists: true });
    pgm.dropTable('api_keys', { ifExists: true });

    // Recreate old schema for rollback
    pgm.createTable('sessions', {
        session_id: { type: 'varchar(255)', primaryKey: true },
        webhook_url: { type: 'text' },
        status: { type: 'varchar(50)', default: 'DISCONNECTED' },
        whatsapp_id: { type: 'varchar(50)' },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
        updated_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
    });

    pgm.createTable('templates', {
        id: 'id',
        name: { type: 'varchar(255)', notNull: true, unique: true },
        content: { type: 'text', notNull: true },
        language: { type: 'varchar(10)', default: 'en' },
        category: { type: 'varchar(50)' },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
        updated_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
    });

    pgm.createTable('message_logs', {
        id: 'id',
        session_id: {
            type: 'varchar(255)',
            notNull: true,
            references: '"sessions"',
            onDelete: 'CASCADE',
        },
        direction: { type: 'varchar(10)', notNull: true },
        message_id: { type: 'varchar(255)' },
        recipient: { type: 'varchar(255)' },
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

    pgm.createTable('webhook_deliveries', {
        id: 'id',
        session_id: { type: 'varchar(255)', notNull: true },
        webhook_url: { type: 'text', notNull: true },
        event_type: { type: 'varchar(100)', notNull: true },
        payload: { type: 'jsonb' },
        status: { type: 'varchar(50)' },
        attempts: { type: 'integer', default: 0 },
        last_attempt_at: { type: 'timestamp' },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
    });
    pgm.createIndex('webhook_deliveries', 'session_id');

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
