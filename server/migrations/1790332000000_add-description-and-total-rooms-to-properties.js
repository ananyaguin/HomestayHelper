/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.addColumns('properties', {
    description: {
      type: 'text',
      notNull: false,
    },
    total_rooms: {
      type: 'integer',
      notNull: true,
      default: 4,
      check: 'total_rooms > 0',
    },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropColumns('properties', ['description', 'total_rooms'], { ifExists: true });
};
