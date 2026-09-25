process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/homestayhelper_dev';
const { updateRequestStatus } = require('../server/src/services/requestService');
const { Pool } = require('../server/node_modules/pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function debug() {
  const reqRes = await pool.query('SELECT gr.id, gr.booking_id, p.id AS property_id, p.owner_id FROM guest_requests gr JOIN bookings b ON gr.booking_id = b.id JOIN rooms r ON b.room_id = r.id JOIN properties p ON r.property_id = p.id LIMIT 1');
  if (reqRes.rows.length === 0) return console.log('No requests found');
  const row = reqRes.rows[0];
  console.log('Row:', row);

  try {
    const res = await updateRequestStatus(row.owner_id, row.property_id, row.id, 'IN_PROGRESS');
    console.log('Success:', res);
  } catch (err) {
    console.error('Error:', err);
  }

  await pool.end();
}

debug();
