/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  // 1. Create ENUM types
  pgm.createType('message_sender', ['owner', 'guest']);
  pgm.createType('ledger_entry_type', ['charge', 'payment']);

  // 2. guest_tokens
  pgm.createTable('guest_tokens', {
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
    },
    token_hash: {
      type: 'varchar(255)',
      notNull: true,
    },
    issued_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    expires_at: {
      type: 'timestamptz',
      notNull: true,
    },
    revoked_at: {
      type: 'timestamptz',
    },
    status: {
      type: 'varchar(50)',
      notNull: true,
    },
  });

  // 3. guest_requests
  pgm.createTable('guest_requests', {
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
    },
    type: {
      type: 'varchar(50)',
      notNull: true,
    },
    status: {
      type: 'varchar(50)',
      notNull: true,
    },
    note: {
      type: 'text',
    },
    client_ref: {
      type: 'varchar(255)',
      unique: true,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    resolved_at: {
      type: 'timestamptz',
    },
  });

  // 4. messages
  pgm.createTable('messages', {
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
    },
    sender: {
      type: 'message_sender',
      notNull: true,
    },
    content: {
      type: 'text',
      notNull: true,
    },
    translated_content: {
      type: 'text',
    },
    intent_tag: {
      type: 'varchar(100)',
    },
    priority: {
      type: 'varchar(50)',
      notNull: true,
    },
    client_ref: {
      type: 'varchar(255)',
      unique: true,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // 5. ledger_entries
  pgm.createTable('ledger_entries', {
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
    },
    type: {
      type: 'ledger_entry_type',
      notNull: true,
    },
    amount: {
      type: 'numeric(10, 2)',
      notNull: true,
    },
    currency: {
      type: 'varchar(10)',
      notNull: true,
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

  // 6. checklists
  pgm.createTable('checklists', {
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
    title: {
      type: 'varchar(255)',
      notNull: true,
    },
    items: {
      type: 'jsonb',
      notNull: true,
      default: '{}',
    },
    date: {
      type: 'date',
      notNull: true,
    },
    completed_by: {
      type: 'varchar(255)',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // 7. listings
  pgm.createTable('listings', {
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
    variant: {
      type: 'varchar(100)',
      notNull: true,
    },
    generated_content: {
      type: 'text',
      notNull: true,
    },
    engine_used: {
      type: 'varchar(100)',
      notNull: true,
    },
    status: {
      type: 'varchar(50)',
      notNull: true,
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // 8. ai_logs
  pgm.createTable('ai_logs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    booking_id: {
      type: 'uuid',
      references: '"bookings"',
      onDelete: 'SET NULL',
    },
    task: {
      type: 'varchar(100)',
      notNull: true,
    },
    engine: {
      type: 'varchar(100)',
      notNull: true,
    },
    confidence: {
      type: 'numeric',
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
  pgm.dropTable('ai_logs', { ifExists: true, cascade: true });
  pgm.dropTable('listings', { ifExists: true, cascade: true });
  pgm.dropTable('checklists', { ifExists: true, cascade: true });
  pgm.dropTable('ledger_entries', { ifExists: true, cascade: true });
  pgm.dropTable('messages', { ifExists: true, cascade: true });
  pgm.dropTable('guest_requests', { ifExists: true, cascade: true });
  pgm.dropTable('guest_tokens', { ifExists: true, cascade: true });
  pgm.dropType('ledger_entry_type', { ifExists: true, cascade: true });
  pgm.dropType('message_sender', { ifExists: true, cascade: true });
};
