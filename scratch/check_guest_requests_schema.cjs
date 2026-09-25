process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/homestayhelper_dev';
const { Pool } = require('../server/node_modules/pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  console.log('=== GUEST_REQUESTS COLUMNS ===');
  const colRes = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'guest_requests'
  `);
  console.table(colRes.rows);

  await pool.end();
}

main().catch(err => console.error(err));
