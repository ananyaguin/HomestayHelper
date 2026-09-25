/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  // 1. Add payment_method to ledger_entries
  pgm.addColumn('ledger_entries', {
    payment_method: {
      type: 'varchar(20)',
      notNull: false,
    },
  });

  // 2. Create expenses table for owner manual expenses
  pgm.createTable('expenses', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    property_id: {
      type: 'uuid',
      notNull: true,
      references: '"properties"',
      onDelete: 'CASCADE',
    },
    category: {
      type: 'varchar(100)',
      notNull: true,
    },
    amount: {
      type: 'numeric(10, 2)',
      notNull: true,
    },
    payment_method: {
      type: 'varchar(20)',
      notNull: true,
      default: 'cash',
    },
    note: {
      type: 'text',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // Index on property_id and created_at
  pgm.createIndex('expenses', 'property_id');
  pgm.createIndex('expenses', 'created_at');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('expenses');
  pgm.dropColumn('ledger_entries', 'payment_method');
};
