const { Pool } = require('../server/node_modules/pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/homestayhelper_dev'
});

async function main() {
  const propsRes = await pool.query('SELECT id, owner_id, name, total_rooms FROM properties');
  console.log('PROPERTIES IN DB:');
  console.table(propsRes.rows);

  const roomsRes = await pool.query('SELECT id, property_id, name FROM rooms ORDER BY created_at ASC');
  console.log('ROOMS IN DB:');
  console.table(roomsRes.rows);

  await pool.end();
}

main().catch(err => console.error(err));
