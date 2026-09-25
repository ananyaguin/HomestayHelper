process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/homestayhelper_dev';
const http = require('http');
const { Pool } = require('../server/node_modules/pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runRefinementTest() {
  console.log('=== STARTING END-TO-END GUEST & OWNER REQUEST REFINEMENT TEST ===');

  // 1. Resolve an active stay token & property ID
  const tokenRes = await pool.query('SELECT gt.token_hash, b.room_id, r.property_id, p.owner_id FROM guest_tokens gt JOIN bookings b ON gt.booking_id = b.id JOIN rooms r ON b.room_id = r.id JOIN properties p ON r.property_id = p.id WHERE gt.status = \'active\' ORDER BY gt.issued_at DESC LIMIT 1');
  if (tokenRes.rows.length === 0) {
    throw new Error('No active guest stay token found.');
  }

  const { token_hash: token, property_id: propertyId, owner_id: ownerId } = tokenRes.rows[0];
  console.log(`Active Token: ${token}`);
  console.log(`Property ID: ${propertyId}`);
  console.log(`Owner ID: ${ownerId}`);

  // Generate Owner JWT
  const jwt = require('../server/node_modules/jsonwebtoken');
  const ownerToken = jwt.sign({ ownerId }, process.env.JWT_SECRET || 'homestay_helper_dev_jwt_secret_key_2026', { expiresIn: '1h' });

  // 2. Guest submits request 1 "Drinking Water"
  console.log('\n1. Guest submits request "Drinking Water"...');
  const postRes1 = await makeRequest('POST', `/api/guest/stay/${token}/requests`, {
    item: 'Drinking Water',
    note: 'Cold water please'
  });
  if (postRes1.status !== 201) throw new Error('Guest request 1 submission failed!');
  const reqId1 = postRes1.body.request.id;
  console.log(`PASS: Request 1 created ID: ${reqId1}, status: ${postRes1.body.request.status}`);

  // 3. Guest submits request 2 "Extra Towel"
  console.log('\n2. Guest submits request "Extra Towel"...');
  const postRes2 = await makeRequest('POST', `/api/guest/stay/${token}/requests`, {
    item: 'Extra Towel',
    note: 'Soft bath towel'
  });
  if (postRes2.status !== 201) throw new Error('Guest request 2 submission failed!');
  const reqId2 = postRes2.body.request.id;
  console.log(`PASS: Request 2 created ID: ${reqId2}, status: ${postRes2.body.request.status}`);

  // 4. Owner fetches requests & updates Request 1 to COMPLETED
  console.log('\n3. Owner updates Request 1 to COMPLETED...');
  const patchComplete = await makeRequest('PATCH', `/api/properties/${propertyId}/requests/${reqId1}`, {
    status: 'COMPLETED'
  }, ownerToken);
  if (patchComplete.status !== 200 || patchComplete.body.request.status !== 'COMPLETED') {
    throw new Error('Failed to update Request 1 status to COMPLETED!');
  }
  console.log('PASS: Request 1 updated to COMPLETED');

  // 5. Test Guest CANNOT cancel Request 1 (since it is COMPLETED)
  console.log('\n4. Testing Guest CANNOT cancel COMPLETED request...');
  const cancelCompletedRes = await makeRequest('PATCH', `/api/guest/stay/${token}/requests/${reqId1}/cancel`);
  if (cancelCompletedRes.status !== 400) {
    throw new Error(`Expected 400 when cancelling COMPLETED request, got ${cancelCompletedRes.status}`);
  }
  console.log('PASS: COMPLETED request cannot be cancelled by guest (HTTP 400)');

  // 6. Guest cancels Request 2 (PENDING)
  console.log('\n5. Guest cancels Request 2 (PENDING)...');
  const cancelRes = await makeRequest('PATCH', `/api/guest/stay/${token}/requests/${reqId2}/cancel`);
  if (cancelRes.status !== 200 || cancelRes.body.request.status !== 'CANCELLED') {
    throw new Error('Guest failed to cancel PENDING request!');
  }
  console.log('PASS: PENDING request cancelled by guest successfully (status: CANCELLED)');

  // 7. Owner removes Request 2 (CANCELLED)
  console.log('\n6. Owner removes CANCELLED request...');
  const removeRes = await makeRequest('DELETE', `/api/properties/${propertyId}/requests/${reqId2}`, null, ownerToken);
  if (removeRes.status !== 200) throw new Error('Owner failed to remove CANCELLED request!');
  console.log('PASS: Owner removed CANCELLED request successfully');

  // 8. Owner removes Request 1 (COMPLETED)
  console.log('\n7. Owner removes COMPLETED request...');
  const removeRes1 = await makeRequest('DELETE', `/api/properties/${propertyId}/requests/${reqId1}`, null, ownerToken);
  if (removeRes1.status !== 200) throw new Error('Owner failed to remove COMPLETED request!');
  console.log('PASS: Owner removed COMPLETED request successfully');

  console.log('\n=== ALL REFINEMENT END-TO-END TESTS PASSED SUCCESSFULLY! ===');
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

runRefinementTest().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
