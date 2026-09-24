/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.dropTable('rooms', { ifExists: true, cascade: true });
  pgm.dropTable('properties', { ifExists: true, cascade: true });

  // 1. owners table
  pgm.createTable('owners', {
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
    phone: {
      type: 'varchar(50)',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // 2. properties table
  pgm.createTable('properties', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    owner_id: {
      type: 'uuid',
      notNull: true,
      references: '"owners"',
      onDelete: 'CASCADE',
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    address: {
      type: 'text',
    },
    wifi_ssid: {
      type: 'varchar(255)',
    },
    wifi_password: {
      type: 'varchar(255)',
    },
    emergency_contacts: {
      type: 'jsonb',
      notNull: true,
      default: '{}',
    },
    amenities: {
      type: 'jsonb',
      notNull: true,
      default: '{}',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // 3. rooms table
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
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    capacity: {
      type: 'integer',
      notNull: true,
    },
    price: {
      type: 'numeric(10, 2)',
      notNull: true,
    },
    description: {
      type: 'text',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('rooms', { ifExists: true, cascade: true });
  pgm.dropTable('properties', { ifExists: true, cascade: true });
  pgm.dropTable('owners', { ifExists: true, cascade: true });
};
