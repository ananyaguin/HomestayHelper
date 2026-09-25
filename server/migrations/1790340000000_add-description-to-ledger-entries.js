/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.addColumns('ledger_entries', {
    description: {
      type: 'text',
      notNull: false,
    },
  });
  pgm.alterColumn('ledger_entries', 'currency', {
    default: 'INR',
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropColumns('ledger_entries', ['description'], { ifExists: true });
  pgm.alterColumn('ledger_entries', 'currency', {
    default: null,
  });
};
