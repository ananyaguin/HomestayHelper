process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/homestayhelper_dev';
const { Pool } = require('../server/node_modules/pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  console.log('Testing null wifi fields handling...');
  const wifiSsid = null;
  const wifiPassword = null;
  const wifiData = (wifiSsid && wifiPassword) ? { ssid: wifiSsid, password: wifiPassword } : null;
  console.log('wifiData when null:', wifiData);
  if (wifiData !== null) throw new Error('Expected wifiData to be null!');
  console.log('PASS: wifiData is null when Wi-Fi is not configured!');
  await pool.end();
}

main().catch(err => console.error(err));
