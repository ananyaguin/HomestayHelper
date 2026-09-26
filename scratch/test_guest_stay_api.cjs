process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/homestayhelper_dev';
const http = require('http');
const { Pool } = require('../server/node_modules/pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runTest() {
  console.log('=== TESTING GUEST STAY ENDPOINT (REAL BACKEND DATA) ===');

  // 1. Get a token from guest_tokens table
  const tokenRes = await pool.query('SELECT token_hash FROM guest_tokens WHERE status = \'active\' ORDER BY issued_at DESC LIMIT 1');
  if (tokenRes.rows.length === 0) {
    throw new Error('No active guest stay token found in DB.');
  }
  const token = tokenRes.rows[0].token_hash;
  console.log(`Using active stay token: ${token}`);

  // 2. Fetch GET /api/guest/stay/:token
  const res = await makeRequest('GET', `/api/guest/stay/${token}`);
  console.log('Response Status:', res.status);
  console.log('Response Body:', JSON.stringify(res.body, null, 2));

  if (res.status !== 200) {
    throw new Error('Failed to fetch guest stay! Status: ' + res.status);
  }

  const { property, guest, stay, wifi } = res.body;

  // Verify property fields
  console.log('\nVERIFYING FIELDS:');
  console.log('Property Name:', property.name);
  console.log('Property Address:', property.address);
  console.log('Host Name:', property.hostName);
  console.log('Host Phone:', property.hostPhone);
  console.log('Wi-Fi Object:', wifi);

  if (!property.name) throw new Error('Property name is missing!');
  if (!property.hostName) throw new Error('Host name is missing!');

  console.log('\n=== ALL GUEST STAY ENDPOINT TESTS PASSED! ===');
  await pool.end();
}

function makeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(resData);
          resolve({ status: res.statusCode, body: json });
        } catch {
          resolve({ status: res.statusCode, body: resData });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

runTest().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
