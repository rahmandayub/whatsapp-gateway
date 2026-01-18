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
    id: 'id', // Shortcut for serial primary key
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
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('templates');
  pgm.dropTable('sessions');
};
