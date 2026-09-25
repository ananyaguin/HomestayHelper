/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.sql(`
    -- 1. Convert check_in and check_out from date to timestamptz in bookings
    ALTER TABLE bookings 
      ALTER COLUMN check_in TYPE timestamptz USING check_in::timestamptz,
      ALTER COLUMN check_out TYPE timestamptz USING check_out::timestamptz;

    -- 2. Add total_guests column to bookings
    ALTER TABLE bookings 
      ADD COLUMN IF NOT EXISTS total_guests INTEGER NOT NULL DEFAULT 1;

    -- 3. Drop unique constraint on guests.booking_id to allow multiple guests per booking
    ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_booking_id_key;

    -- 4. Add is_primary column to guests table
    ALTER TABLE guests 
      ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE guests DROP COLUMN IF EXISTS is_primary;
    ALTER TABLE bookings DROP COLUMN IF EXISTS total_guests;
    ALTER TABLE bookings 
      ALTER COLUMN check_in TYPE date USING check_in::date,
      ALTER COLUMN check_out TYPE date USING check_out::date;
  `);
};
