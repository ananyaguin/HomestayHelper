process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/homestayhelper_dev';
const http = require('http');
const { Pool } = require('../server/node_modules/pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runTest() {
  console.log('=== STARTING END-TO-END GUEST REQUEST FLOW TEST ===');

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

  // 2. Guest submits a new request "Room Cleaning"
  console.log('\n1. Guest submits request "Room Cleaning"...');
  const postRes = await makeRequest('POST', `/api/guest/stay/${token}/requests`, {
    item: 'Room Cleaning',
    note: 'Please clean around 4 PM'
  });

  if (postRes.status !== 201) throw new Error('Guest request submission failed!');
  const reqId = postRes.body.request.id;
  console.log(`Request created with ID: ${reqId}, status: ${postRes.body.request.status}`);
  if (postRes.body.request.status !== 'PENDING') throw new Error('Initial status is not PENDING!');

  // 3. Verify Owner Requests endpoint lists the request
  console.log('\n2. Owner fetches requests...');
  const ownerGetRes = await makeRequest('GET', `/api/properties/${propertyId}/requests`, null, ownerToken);
  if (ownerGetRes.status !== 200) throw new Error('Owner GET requests failed!');
  const reqInOwnerList = ownerGetRes.body.requests.find(r => r.id === reqId);
  if (!reqInOwnerList) throw new Error('Submitted request not found in Owner list!');
  console.log('PASS: Request found in Owner Requests list:', {
    type: reqInOwnerList.type,
    room: reqInOwnerList.room_name,
    guest: reqInOwnerList.guest_name,
    status: reqInOwnerList.status
  });

  // 4. Owner updates status to IN_PROGRESS (Accept)
  console.log('\n3. Owner updates status to IN_PROGRESS...');
  const patchAccept = await makeRequest('PATCH', `/api/properties/${propertyId}/requests/${reqId}`, {
    status: 'IN_PROGRESS'
  }, ownerToken);
  if (patchAccept.status !== 200 || patchAccept.body.request.status !== 'IN_PROGRESS') {
    throw new Error('Failed to update status to IN_PROGRESS!');
  }
  console.log('PASS: Status updated to IN_PROGRESS!');

  // 5. Verify Guest sees IN_PROGRESS status
  console.log('\n4. Guest fetches requests status...');
  const guestGetRes1 = await makeRequest('GET', `/api/guest/stay/${token}/requests`);
  const reqInGuestList1 = guestGetRes1.body.requests.find(r => r.id === reqId);
  if (reqInGuestList1.status !== 'IN_PROGRESS') throw new Error('Guest does not see IN_PROGRESS status!');
  console.log('PASS: Guest sees status:', reqInGuestList1.status);

  // 6. Owner updates status to COMPLETED
  console.log('\n5. Owner updates status to COMPLETED...');
  const patchComplete = await makeRequest('PATCH', `/api/properties/${propertyId}/requests/${reqId}`, {
    status: 'COMPLETED'
  }, ownerToken);
  if (patchComplete.status !== 200 || patchComplete.body.request.status !== 'COMPLETED') {
    throw new Error('Failed to update status to COMPLETED!');
  }
  console.log('PASS: Status updated to COMPLETED!');

  // 7. Verify Guest sees COMPLETED status
  console.log('\n6. Guest fetches requests status...');
  const guestGetRes2 = await makeRequest('GET', `/api/guest/stay/${token}/requests`);
  const reqInGuestList2 = guestGetRes2.body.requests.find(r => r.id === reqId);
  if (reqInGuestList2.status !== 'COMPLETED') throw new Error('Guest does not see COMPLETED status!');
  console.log('PASS: Guest sees status:', reqInGuestList2.status);

  console.log('\n=== ALL END-TO-END GUEST REQUEST FLOW TESTS PASSED! ===');
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
