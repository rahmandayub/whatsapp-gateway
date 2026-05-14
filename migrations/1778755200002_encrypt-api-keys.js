/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = async (pgm) => {
    // Idempotent: skip if already migrated
    const hasEncrypted = await pgm.db.query(
        "SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'encrypted_key'"
    );
    if (hasEncrypted.rows.length > 0) {
        return;
    }

    // Add encrypted_key column
    pgm.addColumn('api_keys', {
        encrypted_key: {
            type: 'text',
            notNull: false,
        },
    });

    // Note: To encrypt existing full_key values, run the application once
    // with the KEY_ENCRYPTION_SECRET set, which will encrypt on read/write.
    // Or run a one-off script:
    //   UPDATE api_keys SET encrypted_key = encrypt(full_key) WHERE full_key IS NOT NULL;
    // Then drop the full_key column.
    // For now, we leave full_key in place to allow a graceful transition.
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropColumn('api_keys', 'encrypted_key');
};
