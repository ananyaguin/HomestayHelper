/**
 * Migration: Add id_type and id_number columns to guests table
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE guests 
      ADD COLUMN IF NOT EXISTS id_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS id_number VARCHAR(100);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE guests 
      DROP COLUMN IF EXISTS id_number,
      DROP COLUMN IF EXISTS id_type;
  `);
};
