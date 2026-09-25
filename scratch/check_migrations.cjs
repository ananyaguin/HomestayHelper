process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/homestayhelper_dev';
const { Pool } = require('../server/node_modules/pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  console.log('=== PG MIGRATIONS TABLE ===');
  const migRes = await pool.query('SELECT name, run_on FROM pgmigrations ORDER BY run_on ASC');
  console.table(migRes.rows);

  console.log('\n=== LEDGER_ENTRIES COLUMNS ===');
  const colRes = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'ledger_entries'
  `);
  console.table(colRes.rows);

  await pool.end();
}

main().catch(err => console.error(err));
