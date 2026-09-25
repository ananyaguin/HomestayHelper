const pool = require('../db/pool');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Normalizes and formats a booking record for API responses.
 * Provides both check_in / check_out and check_in_date / check_out_date for client convenience.
 */
function formatBooking(row) {
  if (!row) return row;
  const checkInStr = row.check_in instanceof Date
    ? row.check_in.toISOString().split('T')[0]
    : String(row.check_in || '');
  const checkOutStr = row.check_out instanceof Date
    ? row.check_out.toISOString().split('T')[0]
    : String(row.check_out || '');

  return {
    id: row.id,
    room_id: row.room_id,
    guest_name: row.guest_name,
    guest_phone: row.guest_phone,
    check_in: checkInStr,
    check_out: checkOutStr,
    check_in_date: checkInStr,
    check_out_date: checkOutStr,
    status: row.status,
    created_at: row.created_at,
    ...(row.room_name ? { room_name: row.room_name } : {}),
    ...(row.property_id ? { property_id: row.property_id } : {}),
    ...(row.property_name ? { property_name: row.property_name } : {})
  };
}

function isValidDate(dateStr) {
  if (typeof dateStr !== 'string') return false;
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return !isNaN(d.getTime());
  }
  const d = new Date(trimmed);
  return !isNaN(d.getTime());
}

function normalizeDate(dateStr) {
  const trimmed = typeof dateStr === 'string' ? dateStr.trim() : dateStr;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const d = new Date(trimmed);
  return d.toISOString().split('T')[0];
}

/**
 * Retrieves all bookings scoped strictly to the authenticated owner.
 * Ownership chain: booking -> room -> property -> owner
 */
async function getBookings(ownerId) {
  if (!ownerId) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }

  const query = `
    SELECT 
      b.id,
      b.room_id,
      b.guest_name,
      b.guest_phone,
      b.check_in::text AS check_in,
      b.check_out::text AS check_out,
      b.status,
      b.created_at,
      r.name AS room_name,
      p.id AS property_id,
      p.name AS property_name
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    JOIN properties p ON r.property_id = p.id
    WHERE p.owner_id = $1
    ORDER BY b.created_at DESC
  `;

  const result = await pool.query(query, [ownerId]);
  return result.rows.map(formatBooking);
}

/**
 * Creates a new booking and associated guest row in a single atomic transaction.
 * Strictly verifies room belongs to an authenticated owner's property.
 * Initial status is always 'upcoming'.
 */
async function createBooking(ownerId, data) {
  if (!ownerId) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }

  const roomId = data.room_id || data.roomId;
  if (!roomId || !UUID_REGEX.test(roomId)) {
    const err = new Error('Room not found');
    err.status = 404;
    throw err;
  }

  // 1. Verify that the room exists and belongs to the authenticated owner
  const roomCheckSql = `
    SELECT r.id, r.property_id
    FROM rooms r
    JOIN properties p ON r.property_id = p.id
    WHERE r.id = $1 AND p.owner_id = $2
  `;
  const roomCheck = await pool.query(roomCheckSql, [roomId, ownerId]);
  if (roomCheck.rows.length === 0) {
    const err = new Error('Room not found');
    err.status = 404;
    throw err;
  }

  // 2. Validate guest name
  const guestName = typeof (data.guest_name || data.guestName) === 'string'
    ? (data.guest_name || data.guestName).trim()
    : '';
  if (!guestName) {
    const err = new Error('Guest name is required');
    err.status = 400;
    throw err;
  }
  if (guestName.length > 255) {
    const err = new Error('Guest name must not exceed 255 characters');
    err.status = 400;
    throw err;
  }

  // 3. Validate guest phone
  const guestPhone = typeof (data.guest_phone || data.guestPhone) === 'string'
    ? (data.guest_phone || data.guestPhone).trim()
    : '';
  if (!guestPhone) {
    const err = new Error('Guest phone is required');
    err.status = 400;
    throw err;
  }
  if (guestPhone.length > 50) {
    const err = new Error('Guest phone must not exceed 50 characters');
    err.status = 400;
    throw err;
  }

  // 4. Validate check_in and check_out dates
  const rawCheckIn = data.check_in || data.checkIn || data.check_in_date || data.checkInDate;
  const rawCheckOut = data.check_out || data.checkOut || data.check_out_date || data.checkOutDate;

  if (!rawCheckIn || !isValidDate(rawCheckIn)) {
    const err = new Error('Valid check_in date is required (YYYY-MM-DD)');
    err.status = 400;
    throw err;
  }
  if (!rawCheckOut || !isValidDate(rawCheckOut)) {
    const err = new Error('Valid check_out date is required (YYYY-MM-DD)');
    err.status = 400;
    throw err;
  }

  const checkIn = normalizeDate(rawCheckIn);
  const checkOut = normalizeDate(rawCheckOut);

  if (checkOut < checkIn) {
    const err = new Error('Check-out date must be on or after check-in date');
    err.status = 400;
    throw err;
  }

  // 5. Database transaction for atomic booking + guest creation
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create booking strictly with status 'upcoming'
    const insertBookingSql = `
      INSERT INTO bookings (room_id, guest_name, guest_phone, check_in, check_out, status)
      VALUES ($1, $2, $3, $4, $5, 'upcoming')
      RETURNING id, room_id, guest_name, guest_phone, check_in::text AS check_in, check_out::text AS check_out, status, created_at
    `;
    const bookingRes = await client.query(insertBookingSql, [
      roomId,
      guestName,
      guestPhone,
      checkIn,
      checkOut
    ]);
    const booking = bookingRes.rows[0];

    // Create associated guest row
    const guestEmail = typeof (data.email || data.guest_email || data.guestEmail) === 'string'
      ? (data.email || data.guest_email || data.guestEmail).trim() || null
      : null;
    const languagePref = typeof (data.language_pref || data.languagePref) === 'string'
      ? (data.language_pref || data.languagePref).trim() || null
      : null;

    const insertGuestSql = `
      INSERT INTO guests (booking_id, name, phone, email, language_pref)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, booking_id, name, phone, email, language_pref, created_at
    `;
    const guestRes = await client.query(insertGuestSql, [
      booking.id,
      guestName,
      guestPhone,
      guestEmail,
      languagePref
    ]);
    const guest = guestRes.rows[0];

    await client.query('COMMIT');

    return {
      booking: formatBooking(booking),
      guest
    };
  } catch (txErr) {
    await client.query('ROLLBACK');
    throw txErr;
  } finally {
    client.release();
  }
}

/**
 * Updates editable fields of a booking (guest_name, guest_phone, check_in, check_out, room_id).
 * Strictly forbids status changes through generic PATCH.
 */
async function updateBooking(ownerId, bookingId, data) {
  if (!ownerId) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }

  if (!bookingId || !UUID_REGEX.test(bookingId)) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }

  // 1. Verify booking ownership
  const findBookingSql = `
    SELECT b.id, b.room_id, b.status, b.check_in::text AS check_in, b.check_out::text AS check_out
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    JOIN properties p ON r.property_id = p.id
    WHERE b.id = $1 AND p.owner_id = $2
  `;
  const existingRes = await pool.query(findBookingSql, [bookingId, ownerId]);
  if (existingRes.rows.length === 0) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }
  const existingBooking = existingRes.rows[0];

  const setClauses = [];
  const values = [];

  // Update guest_name if provided
  const rawGuestName = data.guest_name !== undefined ? data.guest_name : data.guestName;
  if (rawGuestName !== undefined) {
    if (typeof rawGuestName !== 'string' || rawGuestName.trim().length === 0) {
      const err = new Error('Guest name cannot be empty');
      err.status = 400;
      throw err;
    }
    if (rawGuestName.trim().length > 255) {
      const err = new Error('Guest name must not exceed 255 characters');
      err.status = 400;
      throw err;
    }
    values.push(rawGuestName.trim());
    setClauses.push(`guest_name = $${values.length}`);
  }

  // Update guest_phone if provided
  const rawGuestPhone = data.guest_phone !== undefined ? data.guest_phone : data.guestPhone;
  if (rawGuestPhone !== undefined) {
    if (typeof rawGuestPhone !== 'string' || rawGuestPhone.trim().length === 0) {
      const err = new Error('Guest phone cannot be empty');
      err.status = 400;
      throw err;
    }
    if (rawGuestPhone.trim().length > 50) {
      const err = new Error('Guest phone must not exceed 50 characters');
      err.status = 400;
      throw err;
    }
    values.push(rawGuestPhone.trim());
    setClauses.push(`guest_phone = $${values.length}`);
  }

  // Update dates if provided
  const rawCheckIn = data.check_in !== undefined ? data.check_in : (data.checkIn !== undefined ? data.checkIn : (data.check_in_date !== undefined ? data.check_in_date : data.checkInDate));
  const rawCheckOut = data.check_out !== undefined ? data.check_out : (data.checkOut !== undefined ? data.checkOut : (data.check_out_date !== undefined ? data.check_out_date : data.checkOutDate));

  let finalCheckIn = existingBooking.check_in;
  let finalCheckOut = existingBooking.check_out;

  if (rawCheckIn !== undefined) {
    if (!isValidDate(rawCheckIn)) {
      const err = new Error('Valid check_in date is required (YYYY-MM-DD)');
      err.status = 400;
      throw err;
    }
    finalCheckIn = normalizeDate(rawCheckIn);
    values.push(finalCheckIn);
    setClauses.push(`check_in = $${values.length}`);
  }

  if (rawCheckOut !== undefined) {
    if (!isValidDate(rawCheckOut)) {
      const err = new Error('Valid check_out date is required (YYYY-MM-DD)');
      err.status = 400;
      throw err;
    }
    finalCheckOut = normalizeDate(rawCheckOut);
    values.push(finalCheckOut);
    setClauses.push(`check_out = $${values.length}`);
  }

  if (finalCheckOut < finalCheckIn) {
    const err = new Error('Check-out date must be on or after check-in date');
    err.status = 400;
    throw err;
  }

  // Update room_id if provided
  const rawRoomId = data.room_id !== undefined ? data.room_id : data.roomId;
  if (rawRoomId !== undefined) {
    if (!UUID_REGEX.test(rawRoomId)) {
      const err = new Error('Room not found');
      err.status = 404;
      throw err;
    }
    // Verify that the new room also belongs to the authenticated owner
    const roomCheckSql = `
      SELECT r.id FROM rooms r
      JOIN properties p ON r.property_id = p.id
      WHERE r.id = $1 AND p.owner_id = $2
    `;
    const roomCheck = await pool.query(roomCheckSql, [rawRoomId, ownerId]);
    if (roomCheck.rows.length === 0) {
      const err = new Error('Room not found');
      err.status = 404;
      throw err;
    }
    values.push(rawRoomId);
    setClauses.push(`room_id = $${values.length}`);
  }

  if (setClauses.length === 0) {
    const err = new Error('No editable fields provided for update');
    err.status = 400;
    throw err;
  }

  // Execute update
  values.push(bookingId);
  const updateSql = `
    UPDATE bookings
    SET ${setClauses.join(', ')}
    WHERE id = $${values.length}
    RETURNING id, room_id, guest_name, guest_phone, check_in::text AS check_in, check_out::text AS check_out, status, created_at
  `;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const updateRes = await client.query(updateSql, values);
    const updatedBooking = updateRes.rows[0];

    // If guest name or phone was updated, synchronize the guests table
    if (rawGuestName !== undefined || rawGuestPhone !== undefined) {
      const guestSetClauses = [];
      const guestValues = [];
      if (rawGuestName !== undefined) {
        guestValues.push(rawGuestName.trim());
        guestSetClauses.push(`name = $${guestValues.length}`);
      }
      if (rawGuestPhone !== undefined) {
        guestValues.push(rawGuestPhone.trim());
        guestSetClauses.push(`phone = $${guestValues.length}`);
      }
      guestValues.push(bookingId);
      const updateGuestSql = `
        UPDATE guests
        SET ${guestSetClauses.join(', ')}
        WHERE booking_id = $${guestValues.length}
      `;
      await client.query(updateGuestSql, guestValues);
    }

    await client.query('COMMIT');
    return {
      booking: formatBooking(updatedBooking)
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Check-in state transition:
 * Only 'upcoming' -> 'checked_in' is permitted.
 */
async function checkIn(ownerId, bookingId) {
  if (!ownerId) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }

  if (!bookingId || !UUID_REGEX.test(bookingId)) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }

  // 1. Verify ownership
  const findSql = `
    SELECT b.id, b.status
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    JOIN properties p ON r.property_id = p.id
    WHERE b.id = $1 AND p.owner_id = $2
  `;
  const findRes = await pool.query(findSql, [bookingId, ownerId]);
  if (findRes.rows.length === 0) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }

  const currentStatus = findRes.rows[0].status;

  // 2. Validate transition
  if (currentStatus !== 'upcoming') {
    const err = new Error(`Booking cannot be checked in from its current state ('${currentStatus}')`);
    err.status = 400;
    throw err;
  }

  // 3. Update status to 'checked_in'
  const updateSql = `
    UPDATE bookings
    SET status = 'checked_in'
    WHERE id = $1
    RETURNING id, room_id, guest_name, guest_phone, check_in::text AS check_in, check_out::text AS check_out, status, created_at
  `;
  const updateRes = await pool.query(updateSql, [bookingId]);
  return {
    booking: formatBooking(updateRes.rows[0])
  };
}

/**
 * Check-out state transition:
 * Only 'checked_in' -> 'checked_out' is permitted.
 * 'upcoming' -> 'checked_out' must return 400 Bad Request.
 */
async function checkOut(ownerId, bookingId) {
  if (!ownerId) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }

  if (!bookingId || !UUID_REGEX.test(bookingId)) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }

  // 1. Verify ownership
  const findSql = `
    SELECT b.id, b.status
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    JOIN properties p ON r.property_id = p.id
    WHERE b.id = $1 AND p.owner_id = $2
  `;
  const findRes = await pool.query(findSql, [bookingId, ownerId]);
  if (findRes.rows.length === 0) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }

  const currentStatus = findRes.rows[0].status;

  // 2. Validate transition
  if (currentStatus === 'upcoming') {
    const err = new Error('Cannot check out a booking that is not checked in');
    err.status = 400;
    throw err;
  }

  if (currentStatus !== 'checked_in') {
    const err = new Error(`Booking cannot be checked out from its current state ('${currentStatus}')`);
    err.status = 400;
    throw err;
  }

  // 3. Update status to 'checked_out'
  const updateSql = `
    UPDATE bookings
    SET status = 'checked_out'
    WHERE id = $1
    RETURNING id, room_id, guest_name, guest_phone, check_in::text AS check_in, check_out::text AS check_out, status, created_at
  `;
  const updateRes = await pool.query(updateSql, [bookingId]);
  return {
    booking: formatBooking(updateRes.rows[0])
  };
}

/**
 * Retrieves public room and property details for guest QR booking page.
 * Resolves: roomId -> room -> property
 * Returns 404 if room does not exist.
 */
async function getPublicRoom(roomId) {
  if (!roomId || !UUID_REGEX.test(roomId)) {
    const err = new Error('Room not found');
    err.status = 404;
    throw err;
  }

  const query = `
    SELECT 
      r.id,
      r.name,
      r.capacity,
      r.price,
      r.description,
      p.id AS property_id,
      p.name AS property_name,
      p.address AS property_address
    FROM rooms r
    JOIN properties p ON r.property_id = p.id
    WHERE r.id = $1
  `;
  const result = await pool.query(query, [roomId]);
  if (result.rows.length === 0) {
    const err = new Error('Room not found');
    err.status = 404;
    throw err;
  }

  return result.rows[0];
}

/**
 * Creates a guest booking and guest record from the QR code flow.
 * Backend strictly resolves roomId -> room -> property -> owner.
 * Ignores any client-supplied owner_id or property_id.
 * Initial status is strictly 'upcoming'.
 */
async function createGuestBooking(roomId, data) {
  if (!roomId || !UUID_REGEX.test(roomId)) {
    const err = new Error('Room not found');
    err.status = 404;
    throw err;
  }

  // 1. Verify room exists and resolve property
  const roomCheckSql = `
    SELECT r.id, r.property_id, p.owner_id, p.name AS property_name
    FROM rooms r
    JOIN properties p ON r.property_id = p.id
    WHERE r.id = $1
  `;
  const roomCheck = await pool.query(roomCheckSql, [roomId]);
  if (roomCheck.rows.length === 0) {
    const err = new Error('Room not found');
    err.status = 404;
    throw err;
  }

  // 2. Validate guest name
  const guestName = typeof (data.guest_name || data.guestName || data.name) === 'string'
    ? (data.guest_name || data.guestName || data.name).trim()
    : '';
  if (!guestName) {
    const err = new Error('Guest name is required');
    err.status = 400;
    throw err;
  }
  if (guestName.length > 255) {
    const err = new Error('Guest name must not exceed 255 characters');
    err.status = 400;
    throw err;
  }

  // 3. Validate guest phone
  const guestPhone = typeof (data.guest_phone || data.guestPhone || data.phone) === 'string'
    ? (data.guest_phone || data.guestPhone || data.phone).trim()
    : '';
  if (!guestPhone) {
    const err = new Error('Guest phone is required');
    err.status = 400;
    throw err;
  }
  if (guestPhone.length > 50) {
    const err = new Error('Guest phone must not exceed 50 characters');
    err.status = 400;
    throw err;
  }

  // 4. Validate check_in and check_out dates
  const rawCheckIn = data.check_in || data.checkIn || data.check_in_date || data.checkInDate;
  const rawCheckOut = data.check_out || data.checkOut || data.check_out_date || data.checkOutDate;

  if (!rawCheckIn || !isValidDate(rawCheckIn)) {
    const err = new Error('Valid check_in date is required (YYYY-MM-DD)');
    err.status = 400;
    throw err;
  }
  if (!rawCheckOut || !isValidDate(rawCheckOut)) {
    const err = new Error('Valid check_out date is required (YYYY-MM-DD)');
    err.status = 400;
    throw err;
  }

  const checkIn = normalizeDate(rawCheckIn);
  const checkOut = normalizeDate(rawCheckOut);

  if (checkOut < checkIn) {
    const err = new Error('Check-out date must be on or after check-in date');
    err.status = 400;
    throw err;
  }

  // 5. Database transaction for atomic booking + guest creation
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create booking strictly with status 'upcoming'
    const insertBookingSql = `
      INSERT INTO bookings (room_id, guest_name, guest_phone, check_in, check_out, status)
      VALUES ($1, $2, $3, $4, $5, 'upcoming')
      RETURNING id, room_id, guest_name, guest_phone, check_in::text AS check_in, check_out::text AS check_out, status, created_at
    `;
    const bookingRes = await client.query(insertBookingSql, [
      roomId,
      guestName,
      guestPhone,
      checkIn,
      checkOut
    ]);
    const booking = bookingRes.rows[0];

    // Create associated guest row
    const guestEmail = typeof (data.email || data.guest_email || data.guestEmail) === 'string'
      ? (data.email || data.guest_email || data.guestEmail).trim() || null
      : null;
    const languagePref = typeof (data.language_pref || data.languagePref) === 'string'
      ? (data.language_pref || data.languagePref).trim() || null
      : null;

    const insertGuestSql = `
      INSERT INTO guests (booking_id, name, phone, email, language_pref)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, booking_id, name, phone, email, language_pref, created_at
    `;
    const guestRes = await client.query(insertGuestSql, [
      booking.id,
      guestName,
      guestPhone,
      guestEmail,
      languagePref
    ]);
    const guest = guestRes.rows[0];

    await client.query('COMMIT');

    return {
      booking: formatBooking(booking),
      guest
    };
  } catch (txErr) {
    await client.query('ROLLBACK');
    throw txErr;
  } finally {
    client.release();
  }
}

module.exports = {
  getBookings,
  createBooking,
  updateBooking,
  checkIn,
  checkOut,
  getPublicRoom,
  createGuestBooking
};

