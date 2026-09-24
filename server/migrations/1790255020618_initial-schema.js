/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  // 1. Users table
  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    password_hash: {
      type: 'varchar(255)',
      notNull: true,
    },
    role: {
      type: 'varchar(50)',
      notNull: true,
      default: 'GUEST',
      check: "role IN ('OWNER', 'STAFF', 'GUEST')",
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // 2. Properties table
  pgm.createTable('properties', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    description: {
      type: 'text',
    },
    address: {
      type: 'text',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // 3. Rooms table
  pgm.createTable('rooms', {
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
    room_number: {
      type: 'varchar(50)',
      notNull: true,
    },
    name: {
      type: 'varchar(100)',
    },
    room_type: {
      type: 'varchar(50)',
      notNull: true,
    },
    capacity: {
      type: 'integer',
      notNull: true,
      default: 1,
      check: 'capacity > 0',
    },
    price: {
      type: 'numeric(10, 2)',
      notNull: true,
      default: 0.00,
      check: 'price >= 0',
    },
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'AVAILABLE',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.createIndex('rooms', 'property_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('rooms', { ifExists: true, cascade: true });
  pgm.dropTable('properties', { ifExists: true, cascade: true });
  pgm.dropTable('users', { ifExists: true, cascade: true });
};
