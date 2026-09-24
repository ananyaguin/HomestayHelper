/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  // 1. Enum type for booking status
  pgm.createType('booking_status', [
    'upcoming',
    'checked_in',
    'checked_out',
    'cancelled',
  ]);

  // 2. Bookings table
  pgm.createTable('bookings', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    room_id: {
      type: 'uuid',
      notNull: true,
      references: '"rooms"',
      onDelete: 'CASCADE',
    },
    guest_name: {
      type: 'varchar(255)',
      notNull: true,
    },
    guest_phone: {
      type: 'varchar(50)',
      notNull: true,
    },
    check_in: {
      type: 'date',
      notNull: true,
    },
    check_out: {
      type: 'date',
      notNull: true,
    },
    status: {
      type: 'booking_status',
      notNull: true,
      default: 'upcoming',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // 3. Guests table
  pgm.createTable('guests', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    booking_id: {
      type: 'uuid',
      notNull: true,
      references: '"bookings"',
      onDelete: 'CASCADE',
      unique: true,
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    phone: {
      type: 'varchar(50)',
    },
    email: {
      type: 'varchar(255)',
    },
    language_pref: {
      type: 'varchar(50)',
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
  pgm.dropTable('guests', { ifExists: true, cascade: true });
  pgm.dropTable('bookings', { ifExists: true, cascade: true });
  pgm.dropType('booking_status', { ifExists: true, cascade: true });
};
