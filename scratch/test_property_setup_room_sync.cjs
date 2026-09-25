const http = require('http');
const { Pool } = require('../server/node_modules/pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/homestayhelper_dev'
});

async function runTest() {
  console.log('=== STARTING PROPERTY SETUP ROOM SYNC TEST ===');

  const email = `sync_owner_${Date.now()}@example.com`;
  const phone = '9' + String(Date.now()).slice(-9);
  console.log(`1. Registering test owner: ${email} / ${phone}`);
  const authRes = await makeRequest('POST', '/api/auth/signup', {
    name: 'Sync Owner',
    phone,
    recoveryEmail: email,
    password: 'Password123!',
    confirmPassword: 'Password123!'
  });

  const token = authRes.body.token;
  if (!token) {
    throw new Error('Failed to register/login test owner: ' + JSON.stringify(authRes.body));
  }
  console.log('Owner registered successfully. Token received.');

  // Step 1: Create Property A with total_rooms = 4
  console.log('\nStep 1: Creating Property A with total_rooms = 4...');
  const createPropARes = await makeRequest('POST', '/api/properties', {
    name: 'Property A',
    total_rooms: 4
  }, token);

  const propA = createPropARes.body.property;
  console.log(`Property A created with ID: ${propA.id}, total_rooms: ${propA.total_rooms}`);

  // Verify DB rooms for Property A
  let dbRoomsA = await getDbRooms(propA.id);
  console.log(`DB has ${dbRoomsA.length} rooms for Property A:`, dbRoomsA.map(r => r.name));
  if (dbRoomsA.length !== 4) throw new Error(`Expected 4 DB rooms, got ${dbRoomsA.length}`);

  // Fetch via API GET /api/properties/:id/rooms
  let apiRoomsA = await makeRequest('GET', `/api/properties/${propA.id}/rooms`, null, token);
  console.log(`API returned ${apiRoomsA.body.rooms.length} rooms for Property A`);
  if (apiRoomsA.body.rooms.length !== 4) throw new Error(`Expected 4 API rooms, got ${apiRoomsA.body.rooms.length}`);

  // Step 2 & 3: Change Property A total_rooms from 4 -> 6 and Save
  console.log('\nStep 2 & 3: Changing Property A total_rooms 4 -> 6 and saving...');
  const patchPropARes = await makeRequest('PATCH', `/api/properties/${propA.id}`, {
    total_rooms: 6
  }, token);

  console.log(`Property A updated. total_rooms in DB: ${patchPropARes.body.property.total_rooms}`);

  // Step 4 & 5: Verify DB & API rooms for Property A
  console.log('\nStep 4 & 5: Verifying PostgreSQL and API now have 6 rooms...');
  dbRoomsA = await getDbRooms(propA.id);
  console.log(`DB has ${dbRoomsA.length} rooms:`, dbRoomsA.map(r => r.name));
  if (dbRoomsA.length !== 6) throw new Error(`Expected 6 DB rooms, got ${dbRoomsA.length}`);

  apiRoomsA = await makeRequest('GET', `/api/properties/${propA.id}/rooms`, null, token);
  console.log(`API returned ${apiRoomsA.body.rooms.length} rooms:`, apiRoomsA.body.rooms.map(r => r.name));
  if (apiRoomsA.body.rooms.length !== 6) throw new Error(`Expected 6 API rooms, got ${apiRoomsA.body.rooms.length}`);

  // Step 6: Rename Room 2
  const room2 = apiRoomsA.body.rooms[1];
  console.log(`\nStep 6: Renaming Room 2 (${room2.id}) to "Executive Ocean View"...`);
  const editRoomRes = await makeRequest('PATCH', `/api/properties/${propA.id}/rooms/${room2.id}`, {
    name: 'Executive Ocean View',
    price: 4500,
    capacity: 3,
    description: 'Beautiful balcony with view'
  }, token);
  console.log('Room updated:', editRoomRes.body.room.name);

  // Step 7 & 8: Change Property A total_rooms 6 -> 7 and Save
  console.log('\nStep 7 & 8: Changing Property A total_rooms 6 -> 7 and saving...');
  await makeRequest('PATCH', `/api/properties/${propA.id}`, {
    total_rooms: 7
  }, token);

  // Step 9 & 10: Verify Room 2 custom name preserved and only Room 7 was created
  console.log('\nStep 9 & 10: Verifying Room 2 custom name preserved & Room 7 created...');
  dbRoomsA = await getDbRooms(propA.id);
  console.log(`DB has ${dbRoomsA.length} rooms:`, dbRoomsA.map(r => r.name));
  if (dbRoomsA.length !== 7) throw new Error(`Expected 7 DB rooms, got ${dbRoomsA.length}`);

  const renamedRoomInDb = dbRoomsA.find(r => r.id === room2.id);
  if (!renamedRoomInDb || renamedRoomInDb.name !== 'Executive Ocean View') {
    throw new Error(`Room 2 custom name was NOT preserved! Current: ${renamedRoomInDb?.name}`);
  }
  console.log('PASS: Room 2 custom name ("Executive Ocean View") is preserved!');

  const newRoom7 = dbRoomsA.find(r => r.name === 'Room 7');
  if (!newRoom7) {
    throw new Error('Room 7 was not created!');
  }
  console.log('PASS: Room 7 was successfully created!');

  // Step 11, 12, 13: Change Property A total_rooms 7 -> 4 (Decrease)
  console.log('\nStep 11, 12, 13: Changing Property A total_rooms 7 -> 4...');
  await makeRequest('PATCH', `/api/properties/${propA.id}`, {
    total_rooms: 4
  }, token);

  dbRoomsA = await getDbRooms(propA.id);
  console.log(`DB has ${dbRoomsA.length} rooms after reduction request:`, dbRoomsA.map(r => r.name));
  if (dbRoomsA.length !== 7) {
    throw new Error(`Rooms were deleted! Expected 7 preserved rooms, but found ${dbRoomsA.length}`);
  }
  console.log('PASS: Existing 7 rooms were NOT deleted on total_rooms decrease!');

  apiRoomsA = await makeRequest('GET', `/api/properties/${propA.id}/rooms`, null, token);
  console.log(`API returned ${apiRoomsA.body.rooms.length} active rooms after reduction:`, apiRoomsA.body.rooms.map(r => r.name));
  if (apiRoomsA.body.rooms.length !== 4) {
    throw new Error(`Expected 4 API rooms matching total_rooms, got ${apiRoomsA.body.rooms.length}`);
  }
  console.log('PASS: API returned exactly 4 active rooms matching total_rooms!');

  // Step 14 & 15: Create Property B and verify switching/isolation
  console.log('\nStep 14 & 15: Creating Property B with total_rooms = 3 and testing isolation...');
  const createPropBRes = await makeRequest('POST', '/api/properties', {
    name: 'Property B',
    total_rooms: 3
  }, token);
  const propB = createPropBRes.body.property;

  let dbRoomsB = await getDbRooms(propB.id);
  console.log(`Property B created with ${dbRoomsB.length} rooms:`, dbRoomsB.map(r => r.name));

  // Edit Property A from 4 (internal total_rooms = 4) -> 8
  console.log('Editing Property A total_rooms to 8...');
  await makeRequest('PATCH', `/api/properties/${propA.id}`, {
    total_rooms: 8
  }, token);

  dbRoomsA = await getDbRooms(propA.id);
  dbRoomsB = await getDbRooms(propB.id);
  console.log(`Property A now has ${dbRoomsA.length} rooms`);
  console.log(`Property B still has ${dbRoomsB.length} rooms`);

  if (dbRoomsB.length !== 3) {
    throw new Error(`Property B rooms were affected! Expected 3, got ${dbRoomsB.length}`);
  }
  if (dbRoomsA.length !== 8) {
    throw new Error(`Property A expected 8 rooms, got ${dbRoomsA.length}`);
  }
  console.log('PASS: Property B rooms were completely untouched!');

  console.log('\n=== ALL 15 TEST STEPS PASSED SUCCESSFULLY! ===');
  await pool.end();
}

function getDbRooms(propertyId) {
  return pool.query(
    'SELECT id, property_id, name, capacity, price, description, created_at FROM rooms WHERE property_id = $1 ORDER BY created_at ASC',
    [propertyId]
  ).then(res => res.rows);
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
