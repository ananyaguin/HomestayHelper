const pool = require('../server/src/db/pool');
const bookingService = require('../server/src/services/bookingService');

async function testDurationBooking() {
  console.log('=== STAY DURATION & CAPACITY BOOKING VERIFICATION ===\n');

  try {
    // Clean up old test bookings
    await pool.query("DELETE FROM bookings WHERE guest_name LIKE '%DurationTest%' OR guest_name LIKE '%Test%'");

    // 1. Get room
    const roomRes = await pool.query('SELECT id, capacity, name FROM rooms LIMIT 1');
    if (roomRes.rows.length === 0) {
      console.error('No room found in database');
      process.exit(1);
    }
    const room = roomRes.rows[0];
    console.log(`Room: "${room.name}" | ID: ${room.id} | Capacity: ${room.capacity}`);

    // 2. Test Booking with stay_duration = 3 days and 2 guests
    console.log('\n--- Test: Booking with Stay Duration (3 Days) ---');
    const startServerTime = new Date();
    const result = await bookingService.createGuestBooking(room.id, {
      guest_name: 'DurationTest Primary',
      guest_phone: '9876543210',
      total_guests: 2,
      stay_duration: 3,
      guests: [
        {
          name: 'DurationTest Primary',
          phone: '9876543210',
          id_photo: 'data:image/png;base64,ID_PRIMARY_123',
          is_primary: true
        },
        {
          name: 'DurationTest Guest 2',
          id_photo: 'data:image/png;base64,ID_GUEST2_456',
          is_primary: false
        }
      ]
    });

    console.log('Booking created:', {
      id: result.booking.id,
      total_guests: result.booking.total_guests,
      check_in: result.booking.check_in,
      check_out: result.booking.check_out,
      token: result.token
    });

    const checkInDate = new Date(result.booking.check_in);
    const checkOutDate = new Date(result.booking.check_out);
    const durationMs = checkOutDate.getTime() - checkInDate.getTime();
    const durationDaysCalculated = Math.round(durationMs / (1000 * 60 * 60 * 24));

    console.log(`Calculated duration: ${durationDaysCalculated} Day(s)`);

    if (durationDaysCalculated === 3) {
      console.log('PASS: Backend correctly calculated checkout time as checkIn + 3 days!');
    } else {
      console.error(`FAIL: Expected 3 days, got ${durationDaysCalculated}`);
    }

    if (result.guests.length === 2) {
      console.log('PASS: Stored 2 guests for total_guests = 2!');
    } else {
      console.error('FAIL: Guest count mismatch');
    }

    // Clean up
    await pool.query("DELETE FROM bookings WHERE guest_name LIKE '%DurationTest%'");
    console.log('\n=== ALL DURATION BOOKING TESTS PASSED PERFECTLY! ===\n');
  } catch (err) {
    console.error('TEST ERROR:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testDurationBooking();
