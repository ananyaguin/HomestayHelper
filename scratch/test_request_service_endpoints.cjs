process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/homestayhelper_dev';
const http = require('http');
const { Pool } = require('../server/node_modules/pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runTest() {
  console.log('=== TESTING GUEST REQUEST ENDPOINTS ===');

  // 1. Get an active guest token
  const tokenRes = await pool.query('SELECT gt.token_hash, b.room_id, r.property_id FROM guest_tokens gt JOIN bookings b ON gt.booking_id = b.id JOIN rooms r ON b.room_id = r.id WHERE gt.status = \'active\' ORDER BY gt.issued_at DESC LIMIT 1');
  if (tokenRes.rows.length === 0) {
    throw new Error('No active guest stay token found.');
  }
  const token = tokenRes.rows[0].token_hash;
  const propertyId = tokenRes.rows[0].property_id;
  console.log(`Active token: ${token}, Property ID: ${propertyId}`);

  // 2. Submit guest request item POST /api/guest/stay/:token/requests
  console.log('\nSubmitting request item "Extra Towel"...');
  const createRes = await makeRequest('POST', `/api/guest/stay/${token}/requests`, {
    item: 'Extra Towel',
    note: 'Please bring 2 soft towels'
  });
  console.log('POST Response:', createRes.status, createRes.body);

  if (createRes.status !== 201) {
    throw new Error('Failed to create guest request!');
  }

  const requestId = createRes.body.request.id;
  console.log(`Created request ID: ${requestId}`);

  // 3. Fetch guest requests GET /api/guest/stay/:token/requests
  console.log('\nFetching guest requests list...');
  const guestReqsRes = await makeRequest('GET', `/api/guest/stay/${token}/requests`);
  console.log('GET Guest Requests Status:', guestReqsRes.status);
  console.log('Requests Count:', guestReqsRes.body.requests.length);
  const foundReq = guestReqsRes.body.requests.find(r => r.id === requestId);
  if (!foundReq) throw new Error('Created request not returned in guest requests list!');
  console.log('PASS: Guest request listed properly:', foundReq);

  // 4. Test Owner endpoints
  // Register/login owner or get existing owner token
  // Get owner_id from property
  const propRes = await pool.query('SELECT owner_id FROM properties WHERE id = $1', [propertyId]);
  const ownerId = propRes.rows[0].owner_id;
  const jwt = require('../server/node_modules/jsonwebtoken');
  const ownerToken = jwt.sign({ ownerId }, process.env.JWT_SECRET || 'homestay_helper_dev_jwt_secret_key_2026', { expiresIn: '1h' });

  console.log('\nFetching owner requests GET /api/properties/' + propertyId + '/requests...');
  const ownerReqsRes = await makeRequest('GET', `/api/properties/${propertyId}/requests`, null, ownerToken);
  console.log('Owner GET Status:', ownerReqsRes.status);
  const foundOwnerReq = ownerReqsRes.body.requests.find(r => r.id === requestId);
  if (!foundOwnerReq) throw new Error('Created request not listed in Owner requests!');
  console.log('PASS: Owner requests endpoint returned request with guest & room details:', foundOwnerReq);

  // 5. Update request status PATCH /api/properties/:propertyId/requests/:requestId -> IN_PROGRESS
  console.log('\nUpdating status to IN_PROGRESS...');
  const patchRes = await makeRequest('PATCH', `/api/properties/${propertyId}/requests/${requestId}`, {
    status: 'IN_PROGRESS'
  }, ownerToken);
  console.log('PATCH Status:', patchRes.status, patchRes.body);

  if (patchRes.body.request.status !== 'IN_PROGRESS') {
    throw new Error('Failed to update request status!');
  }
  console.log('PASS: Status updated to IN_PROGRESS!');

  // 6. Verify guest sees updated status
  const guestReqsUpdated = await makeRequest('GET', `/api/guest/stay/${token}/requests`);
  const updatedFoundReq = guestReqsUpdated.body.requests.find(r => r.id === requestId);
  if (updatedFoundReq.status !== 'IN_PROGRESS') {
    throw new Error('Guest did not see updated status IN_PROGRESS!');
  }
  console.log('PASS: Guest immediately sees updated status IN_PROGRESS!');

  console.log('\n=== ALL REQUEST ENDPOINTS TESTED AND VERIFIED SUCCESSFULLY! ===');
  await pool.end();
}

function makeRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
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
