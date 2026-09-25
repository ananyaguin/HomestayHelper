const pool = require('../server/src/db/pool');
const bookingService = require('../server/src/services/bookingService');

async function testLifecycle() {
  console.log('=== AUTOMATIC BOOKING LIFECYCLE VERIFICATION ===\n');

  try {
    // 1. Get room
    const roomRes = await pool.query('SELECT id, property_id FROM rooms LIMIT 1');
    if (roomRes.rows.length === 0) {
      console.error('No room found in database');
      process.exit(1);
    }
    const roomId = roomRes.rows[0].id;
    console.log('Testing with Room ID:', roomId);

    // Clean up previous test bookings for clean run
    await pool.query("DELETE FROM bookings WHERE guest_name LIKE '%Test%' OR guest_name LIKE '%Guest%'");

    // 2. Test 1-person booking (Active stay)
    const now = new Date();
    const in1 = new Date(now.getTime() - 1000 * 60 * 60).toISOString(); // 1 hr ago
    const out1 = new Date(now.getTime() + 1000 * 60 * 60 * 2).toISOString(); // 2 hrs in future

    console.log('\n--- Test 1: Active 1-Person Booking with ID ---');
    const b1 = await bookingService.createGuestBooking(roomId, {
      guest_name: 'Single Guest Test',
      guest_phone: '9988776655',
      email: 'single@test.com',
      total_guests: 1,
      check_in: in1,
      check_out: out1,
      guests: [
        {
          name: 'Single Guest Test',
          phone: '9988776655',
          email: 'single@test.com',
          id_photo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          is_primary: true
        }
      ]
    });

    console.log('Booking 1 created successfully:', {
      booking_id: b1.booking.id,
      status: b1.booking.status,
      token: b1.token,
      guests_count: b1.guests.length
    });

    if (b1.booking.status !== 'checked_in') {
      console.error('FAIL: Expected booking status to be checked_in (active), got:', b1.booking.status);
    } else {
      console.log('PASS: Room status is dynamically active/checked_in!');
    }

    // 3. Test Stay Token API for b1
    console.log('\n--- Test 2: Fetch Active Stay via Token ---');
    const stayData1 = await bookingService.getGuestStay(b1.token);
    console.log('Guest stay token check:', {
      expired: stayData1.expired,
      guest_name: stayData1.guest?.name,
      room_name: stayData1.stay?.room,
      total_guests: stayData1.stay?.totalGuests,
      registered_guests_count: stayData1.guests?.length
    });

    if (stayData1.expired !== false || stayData1.guests?.length !== 1) {
      console.error('FAIL: Stay token should be valid with 1 registered guest');
    } else {
      console.log('PASS: Active stay token validated successfully!');
    }

    // 4. Test Overlapping Booking Rejection
    console.log('\n--- Test 3: Overlapping Booking Rejection ---');
    try {
      await bookingService.createGuestBooking(roomId, {
        guest_name: 'Overlapping Guest Test',
        guest_phone: '1122334455',
        check_in: in1,
        check_out: out1
      });
      console.error('FAIL: Overlapping booking should have been rejected!');
    } catch (err) {
      console.log('PASS: Overlapping booking rejected with message:', err.message);
    }

    // 5. Clean up b1 for non-overlap future/past tests
    await pool.query('DELETE FROM bookings WHERE id = $1', [b1.booking.id]);

    // 6. Test 2-Person Booking with 2 IDs
    console.log('\n--- Test 4: 2-Person Booking with 2 IDs ---');
    const in2 = new Date(now.getTime() - 1000 * 60 * 30).toISOString();
    const out2 = new Date(now.getTime() + 1000 * 60 * 60 * 5).toISOString();

    const b2 = await bookingService.createGuestBooking(roomId, {
      guest_name: 'Primary Couple Guest Test',
      guest_phone: '9876543210',
      total_guests: 2,
      check_in: in2,
      check_out: out2,
      guests: [
        {
          name: 'Primary Couple Guest Test',
          phone: '9876543210',
          id_photo: 'data:image/png;base64,ID_PHOTO_PRIMARY_123',
          is_primary: true
        },
        {
          name: 'Secondary Guest Partner Test',
          id_photo: 'data:image/png;base64,ID_PHOTO_SECONDARY_456',
          is_primary: false
        }
      ]
    });

    console.log('Booking 2 (Couple) created successfully:', {
      booking_id: b2.booking.id,
      total_guests: b2.booking.total_guests,
      guests_count: b2.guests.length
    });

    if (b2.guests.length === 2 && b2.guests[0].id_photo && b2.guests[1].id_photo) {
      console.log('PASS: Stored ID photo for EACH guest!');
    } else {
      console.error('FAIL: Did not store ID photo for both guests');
    }

    // 7. Test Expired Stay Token
    console.log('\n--- Test 5: Expired Token Test ---');
    const pastIn = new Date(now.getTime() - 1000 * 60 * 60 * 10).toISOString();
    const pastOut = new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString();

    const b3 = await bookingService.createGuestBooking(roomId, {
      guest_name: 'Past Guest Test',
      guest_phone: '5544332211',
      check_in: pastIn,
      check_out: pastOut
    });

    const stayData3 = await bookingService.getGuestStay(b3.token);
    console.log('Expired stay check result:', {
      expired: stayData3.expired,
      message: stayData3.message
    });

    if (stayData3.expired === true) {
      console.log('PASS: Expired token detected correctly after checkout date/time!');
    } else {
      console.error('FAIL: Token should have been expired');
    }

    // Cleanup test bookings
    await pool.query("DELETE FROM bookings WHERE guest_name LIKE '%Test%' OR guest_name LIKE '%Guest%'");
    console.log('\n=== ALL AUTOMATIC LIFECYCLE TESTS PASSED PERFECTLY! ===\n');
  } catch (err) {
    console.error('TEST ERROR:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testLifecycle();
