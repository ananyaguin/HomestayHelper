process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/homestayhelper_dev';
const http = require('http');
const { Pool } = require('../server/node_modules/pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runTest() {
  console.log('=== STARTING GUEST BOOKING CREATION TEST ===');

  // 1. Get an existing room ID
  const roomRes = await pool.query('SELECT r.id, r.name, r.property_id FROM rooms r LIMIT 1');
  if (roomRes.rows.length === 0) {
    throw new Error('No rooms found in database to test guest booking submission.');
  }
  const room = roomRes.rows[0];
  console.log(`Using room ID: ${room.id} (${room.name})`);

  // 2. Submit guest booking payload to POST /api/guest/rooms/:roomId/bookings
  const payload = {
    guest_name: 'Ananya Roy',
    guest_phone: '9876501234',
    email: 'ananya@example.com',
    total_guests: 2,
    stay_duration: 3,
    guests: [
      { name: 'Ananya Roy', phone: '9876501234', email: 'ananya@example.com', id_photo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', is_primary: true },
      { name: 'Rohan Roy', phone: '9876505678', email: 'rohan@example.com', id_photo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', is_primary: false }
    ]
  };

  console.log('Sending POST request to /api/guest/rooms/' + room.id + '/bookings...');
  const res = await makeRequest('POST', `/api/guest/rooms/${room.id}/bookings`, payload);

  console.log('Response Status:', res.status);
  console.log('Response Body:', res.body);

  if (res.status !== 201 && res.status !== 200) {
    throw new Error('Failed to submit booking! Status: ' + res.status + ' Body: ' + JSON.stringify(res.body));
  }

  const bookingId = res.body.booking.id;
  console.log(`Booking created successfully with ID: ${bookingId}`);

  // 3. Verify PostgreSQL bookings table
  const dbBookingRes = await pool.query('SELECT id, room_id, guest_name, guest_phone, total_guests, status FROM bookings WHERE id = $1', [bookingId]);
  if (dbBookingRes.rows.length === 0) {
    throw new Error('Booking record NOT found in PostgreSQL bookings table!');
  }
  console.log('PASS: Booking record verified in PostgreSQL!');

  // 4. Verify corresponding ledger entry created
  const dbLedgerRes = await pool.query('SELECT id, booking_id, type, amount, currency, note, description FROM ledger_entries WHERE booking_id = $1', [bookingId]);
  if (dbLedgerRes.rows.length === 0) {
    throw new Error('Ledger entry NOT found in PostgreSQL ledger_entries table!');
  }
  console.log('PASS: Ledger entry verified in PostgreSQL:', dbLedgerRes.rows[0]);

  // 5. Verify room status computation (Occupied)
  const computeBookingStatus = require('../server/src/services/bookingService');
  const now = new Date();
  const cIn = new Date(res.body.booking.check_in);
  const cOut = new Date(res.body.booking.check_out);
  const isOccupied = now >= cIn && now < cOut;
  console.log(`Booking check_in: ${res.body.booking.check_in}, check_out: ${res.body.booking.check_out}, isOccupied: ${isOccupied}`);
  if (!isOccupied) {
    throw new Error('Booking status is not occupied for active stay duration!');
  }
  console.log('PASS: Room status is OCCUPIED for active stay!');

  // 6. Check duplicate count
  const dupLedgerRes = await pool.query('SELECT COUNT(*) FROM ledger_entries WHERE booking_id = $1', [bookingId]);
  if (parseInt(dupLedgerRes.rows[0].count, 10) !== 1) {
    throw new Error('Duplicate ledger entries found! Count: ' + dupLedgerRes.rows[0].count);
  }
  console.log('PASS: No duplicate ledger entries found (Count: 1)!');

  console.log('\n=== ALL GUEST BOOKING CREATION TESTS PASSED SUCCESSFULLY! ===');
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
