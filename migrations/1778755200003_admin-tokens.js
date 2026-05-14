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
    pgm.createTable('admin_tokens', {
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
        expires_at: { type: 'timestamp' },
        created_by: { type: 'varchar(255)', default: 'admin' },
    });

    pgm.createIndex('admin_tokens', 'key_hash');
    pgm.createIndex('admin_tokens', 'prefix');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable('admin_tokens', { ifExists: true, cascade: true });
};
