const pool = require('../db/pool');
const crypto = require('crypto');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Computes booking status automatically based on database status and current time.
 */
function computeBookingStatus(checkIn, checkOut, dbStatus) {
  if (dbStatus === 'cancelled') return 'cancelled';
  const now = new Date();
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  if (now < inDate) return 'upcoming';
  if (now >= outDate) return 'checked_out';
  return 'checked_in';
}

/**
 * Parses timestamp or date string into valid ISO string.
 */
function parseTimestamp(val, defaultTime = '14:00') {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  let str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    str = `${str}T${defaultTime}:00`;
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * Formats booking object with computed status and normalized dates/times.
 */
function formatBooking(row) {
  if (!row) return row;
  const checkInIso = row.check_in instanceof Date ? row.check_in.toISOString() : String(row.check_in || '');
  const checkOutIso = row.check_out instanceof Date ? row.check_out.toISOString() : String(row.check_out || '');
  const status = computeBookingStatus(checkInIso, checkOutIso, row.db_status || row.status);

  let nights = 1;
  const d1 = new Date(checkInStr);
  const d2 = new Date(checkOutStr);
  if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
    const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    nights = Math.max(1, diffDays);
  }

  const roomPrice = row.room_price !== undefined && row.room_price !== null
    ? parseFloat(row.room_price) || 0
    : 0;
  const totalAmount = (nights * roomPrice).toFixed(2);

  return {
    id: row.id,
    room_id: row.room_id,
    guest_name: row.guest_name,
    guest_phone: row.guest_phone,
    total_guests: row.total_guests || 1,
    check_in: checkInIso,
    check_out: checkOutIso,
    check_in_date: checkInIso,
    check_out_date: checkOutIso,
    status,
    created_at: row.created_at,
    ...(row.room_name ? { room_name: row.room_name } : {}),
    ...(row.property_id ? { property_id: row.property_id } : {}),
    ...(row.property_name ? { property_name: row.property_name } : {})
  };
}

/**
 * Checks if a room has an overlapping active or upcoming booking.
 */
async function checkRoomOverlap(clientOrPool, roomId, checkInIso, checkOutIso, excludeBookingId = null) {
  const params = [roomId, checkInIso, checkOutIso];
  let excludeClause = '';
  if (excludeBookingId) {
    params.push(excludeBookingId);
    excludeClause = `AND id != $4`;
  }

  const query = `
    SELECT id, check_in, check_out
    FROM bookings
    WHERE room_id = $1
      AND status != 'cancelled'
      ${excludeClause}
      AND (check_in < $3 AND check_out > $2)
    LIMIT 1
  `;

  const res = await clientOrPool.query(query, params);
  if (res.rows.length > 0) {
    const err = new Error('Room is already booked for the selected dates and times.');
    err.status = 400;
    throw err;
  }
}

/**
 * Retrieves all bookings belonging to the authenticated owner.
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
      b.check_in,
      b.check_out,
      b.total_guests,
      b.status AS db_status,
      b.created_at,
      r.name AS room_name,
      r.price AS room_price,
      p.id AS property_id,
      p.name AS property_name,
      COALESCE(
        json_agg(
          json_build_object(
            'id', g.id,
            'name', g.name,
            'phone', g.phone,
            'email', g.email,
            'id_photo', g.id_photo,
            'is_primary', g.is_primary
          )
        ) FILTER (WHERE g.id IS NOT NULL), '[]'
      ) AS guests
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    JOIN properties p ON r.property_id = p.id
    LEFT JOIN guests g ON g.booking_id = b.id
    WHERE p.owner_id = $1
    GROUP BY b.id, r.name, p.id, p.name
    ORDER BY b.created_at DESC
  `;

  const result = await pool.query(query, [ownerId]);
  return result.rows.map(formatBooking);
}

/**
 * Creates a new booking from the owner panel (if needed) or admin interface.
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

  const roomCheckSql = `
    SELECT r.id, r.property_id, r.price
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
 * Updates editable fields of a booking.
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

  const findBookingSql = `
    SELECT b.id, b.room_id, b.status, b.check_in, b.check_out
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

  const rawGuestName = data.guest_name !== undefined ? data.guest_name : data.guestName;
  if (rawGuestName !== undefined) {
    if (typeof rawGuestName !== 'string' || rawGuestName.trim().length === 0) {
      const err = new Error('Guest name cannot be empty');
      err.status = 400;
      throw err;
    }
    values.push(rawGuestName.trim());
    setClauses.push(`guest_name = $${values.length}`);
  }

  const rawGuestPhone = data.guest_phone !== undefined ? data.guest_phone : data.guestPhone;
  if (rawGuestPhone !== undefined) {
    if (typeof rawGuestPhone !== 'string' || rawGuestPhone.trim().length === 0) {
      const err = new Error('Guest phone cannot be empty');
      err.status = 400;
      throw err;
    }
    values.push(rawGuestPhone.trim());
    setClauses.push(`guest_phone = $${values.length}`);
  }

  const rawCheckIn = data.check_in !== undefined ? data.check_in : data.checkIn;
  const rawCheckOut = data.check_out !== undefined ? data.check_out : data.checkOut;

  let finalCheckInIso = existingBooking.check_in.toISOString();
  let finalCheckOutIso = existingBooking.check_out.toISOString();

  if (rawCheckIn !== undefined) {
    const parsedIn = parseTimestamp(rawCheckIn, '14:00');
    if (!parsedIn) {
      const err = new Error('Valid check_in date/time is required');
      err.status = 400;
      throw err;
    }
    finalCheckInIso = parsedIn;
    values.push(finalCheckInIso);
    setClauses.push(`check_in = $${values.length}`);
  }

  if (rawCheckOut !== undefined) {
    const parsedOut = parseTimestamp(rawCheckOut, '11:00');
    if (!parsedOut) {
      const err = new Error('Valid check_out date/time is required');
      err.status = 400;
      throw err;
    }
    finalCheckOutIso = parsedOut;
    values.push(finalCheckOutIso);
    setClauses.push(`check_out = $${values.length}`);
  }

  if (new Date(finalCheckOutIso) <= new Date(finalCheckInIso)) {
    const err = new Error('Check-out date and time must be after check-in date and time');
    err.status = 400;
    throw err;
  }

  // Check overlap if dates/times changed
  if (rawCheckIn !== undefined || rawCheckOut !== undefined) {
    await checkRoomOverlap(pool, existingBooking.room_id, finalCheckInIso, finalCheckOutIso, bookingId);
  }

  if (setClauses.length === 0) {
    const err = new Error('No editable fields provided for update');
    err.status = 400;
    throw err;
  }

  values.push(bookingId);
  const updateSql = `
    UPDATE bookings
    SET ${setClauses.join(', ')}
    WHERE id = $${values.length}
    RETURNING id, room_id, guest_name, guest_phone, check_in, check_out, total_guests, status, created_at
  `;

  const updateRes = await pool.query(updateSql, values);
  return {
    booking: formatBooking(updateRes.rows[0])
  };
}

/**
 * Legacy Check-in handler (kept as no-op or status reflector)
 */
async function checkIn(ownerId, bookingId) {
  const bookings = await getBookings(ownerId);
  const b = bookings.find(item => item.id === bookingId);
  if (!b) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }
  return { booking: b };
}

/**
 * Legacy Check-out handler (kept as no-op or status reflector)
 */
async function checkOut(ownerId, bookingId) {
  const bookings = await getBookings(ownerId);
  const b = bookings.find(item => item.id === bookingId);
  if (!b) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }
  return { booking: b };
}

/**
 * Retrieves public room and property details for guest QR booking page.
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
 * Creates a guest booking with multiple guests, ID documents, and automatic lifecycle token.
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

  // 2. Validate primary guest name
  const guestName = typeof (data.guest_name || data.guestName || data.name) === 'string'
    ? (data.guest_name || data.guestName || data.name).trim()
    : '';
  if (!guestName) {
    const err = new Error('Guest name is required');
    err.status = 400;
    throw err;
  }

  // 3. Validate primary guest phone
  const guestPhone = typeof (data.guest_phone || data.guestPhone || data.phone) === 'string'
    ? (data.guest_phone || data.guestPhone || data.phone).trim()
    : '';
  if (!guestPhone) {
    const err = new Error('Guest phone is required');
    err.status = 400;
    throw err;
  }

  // 4. Validate total guests
  const totalGuests = Number(data.total_guests || data.totalGuests || (Array.isArray(data.guests) ? data.guests.length : 1));
  if (!Number.isInteger(totalGuests) || totalGuests <= 0) {
    const err = new Error('Total guests must be a positive number');
    err.status = 400;
    throw err;
  }

  // 5. Calculate check_in and check_out timestamps from server time & stay_duration
  const durationDays = Math.max(1, parseInt(data.stay_duration || data.stayDuration || data.duration, 10) || 1);
  const now = new Date();
  let checkInIso, checkOutIso;

  if (data.stay_duration !== undefined || data.stayDuration !== undefined || !data.check_in) {
    const inDate = new Date(now);
    const outDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    checkInIso = inDate.toISOString();
    checkOutIso = outDate.toISOString();
  } else {
    const rawCheckIn = data.check_in || data.checkIn || data.check_in_date || data.checkInDate;
    const rawCheckOut = data.check_out || data.checkOut || data.check_out_date || data.checkOutDate;
    const checkInTime = data.check_in_time || data.checkInTime || '14:00';
    const checkOutTime = data.check_out_time || data.checkOutTime || '11:00';

    checkInIso = parseTimestamp(rawCheckIn, checkInTime);
    checkOutIso = parseTimestamp(rawCheckOut, checkOutTime);
  }

  if (!checkInIso || !checkOutIso || new Date(checkOutIso) <= new Date(checkInIso)) {
    const err = new Error('Invalid stay duration or date range');
    err.status = 400;
    throw err;
  }

  // 6. Availability / Overlap Check
  await checkRoomOverlap(pool, roomId, checkInIso, checkOutIso);

  // Prepare guests array (supporting multiple guests with ID documents)
  let inputGuests = [];
  if (Array.isArray(data.guests) && data.guests.length > 0) {
    inputGuests = data.guests;
  } else {
    inputGuests = [
      {
        name: guestName,
        phone: guestPhone,
        email: data.email || null,
        id_photo: data.id_photo || data.idPhoto || data.id_document || data.idDocument || null,
        is_primary: true
      }
    ];
  }

  // 5. Database transaction for atomic booking + guest creation
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create booking
    const insertBookingSql = `
      INSERT INTO bookings (room_id, guest_name, guest_phone, check_in, check_out, total_guests, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'upcoming')
      RETURNING id, room_id, guest_name, guest_phone, check_in, check_out, total_guests, status, created_at
    `;
    const bookingRes = await client.query(insertBookingSql, [
      roomId,
      guestName,
      guestPhone,
      checkInIso,
      checkOutIso,
      finalTotalGuests
    ]);
    const booking = bookingRes.rows[0];

    // Insert each guest in guests table
    const createdGuests = [];
    for (let i = 0; i < inputGuests.length; i++) {
      const g = inputGuests[i];
      const gName = (g.name || (i === 0 ? guestName : `Guest ${i + 1}`)).trim();
      const gPhone = g.phone ? String(g.phone).trim() : (i === 0 ? guestPhone : null);
      const gEmail = g.email ? String(g.email).trim() : (i === 0 ? (data.email || null) : null);
      const gIdPhoto = g.id_photo || g.idPhoto || g.id_document || g.idDocument || (i === 0 ? (data.id_photo || null) : null);
      const isPrimary = i === 0 || g.is_primary === true;

      const insertGuestSql = `
        INSERT INTO guests (booking_id, name, phone, email, id_photo, is_primary)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, booking_id, name, phone, email, id_photo, is_primary, created_at
      `;
      const guestRes = await client.query(insertGuestSql, [
        booking.id,
        gName,
        gPhone,
        gEmail,
        gIdPhoto,
        isPrimary
      ]);
      createdGuests.push(guestRes.rows[0]);
    }

    // Create temporary guest stay token that expires at checkout
    const tokenHash = crypto.randomBytes(24).toString('hex');
    const insertTokenSql = `
      INSERT INTO guest_tokens (booking_id, token_hash, expires_at, status)
      VALUES ($1, $2, $3, 'active')
      RETURNING id, token_hash, expires_at, status
    `;
    const tokenRes = await client.query(insertTokenSql, [
      booking.id,
      tokenHash,
      checkOutIso
    ]);
    const guest = guestRes.rows[0];

    await client.query('COMMIT');

    const formatted = formatBooking({
      ...booking,
      guests: createdGuests
    });

    booking.room_price = roomPrice;
    return {
      success: true,
      message: 'Booking submitted successfully',
      token: guestToken.token_hash,
      booking: formatted,
      guests: createdGuests
    };
  } catch (txErr) {
    await client.query('ROLLBACK');
    throw txErr;
  } finally {
    client.release();
  }
}

/**
 * Retrieves guest stay information using the stay token.
 */
async function getGuestStay(token) {
  if (!token) {
    const err = new Error('Guest stay token is required');
    err.status = 400;
    throw err;
  }

  const query = `
    SELECT 
      gt.id AS token_id,
      gt.token_hash,
      gt.expires_at,
      gt.status AS token_status,
      b.id AS booking_id,
      b.room_id,
      b.guest_name,
      b.guest_phone,
      b.check_in,
      b.check_out,
      b.total_guests,
      b.status AS db_status,
      r.name AS room_name,
      r.description AS room_description,
      r.capacity AS room_capacity,
      p.id AS property_id,
      p.name AS property_name,
      p.address AS property_address,
      o.name AS host_name,
      o.phone AS host_phone
    FROM guest_tokens gt
    JOIN bookings b ON gt.booking_id = b.id
    JOIN rooms r ON b.room_id = r.id
    JOIN properties p ON r.property_id = p.id
    JOIN owners o ON p.owner_id = o.id
    WHERE gt.token_hash = $1 OR gt.id::text = $1 OR b.id::text = $1
    ORDER BY gt.issued_at DESC
    LIMIT 1
  `;

  const result = await pool.query(query, [token]);
  if (result.rows.length === 0) {
    const err = new Error('Invalid or expired guest stay token');
    err.status = 404;
    throw err;
  }

  const row = result.rows[0];
  const now = new Date();
  const expiresAt = new Date(row.expires_at || row.check_out);

  if (now >= expiresAt || row.token_status === 'revoked') {
    return {
      expired: true,
      message: 'Stay Expired',
      property: {
        name: row.property_name,
        address: row.property_address
      },
      room: {
        name: row.room_name
      },
      check_out: row.check_out
    };
  }

  // Get all guests for this stay
  const guestsRes = await pool.query(
    `SELECT id, name, phone, email, id_photo, is_primary FROM guests WHERE booking_id = $1 ORDER BY is_primary DESC, created_at ASC`,
    [row.booking_id]
  );

  const status = computeBookingStatus(row.check_in, row.check_out, row.db_status);

  return {
    expired: false,
    guest: {
      name: row.guest_name,
      phone: row.guest_phone
    },
    property: {
      id: row.property_id,
      name: row.property_name,
      address: row.property_address,
      hostName: row.host_name,
      hostPhone: row.host_phone
    },
    stay: {
      booking_id: row.booking_id,
      room: row.room_name,
      roomType: row.room_description || 'Standard Room',
      checkIn: new Date(row.check_in).toLocaleString(),
      checkOut: new Date(row.check_out).toLocaleString(),
      check_in_raw: row.check_in,
      check_out_raw: row.check_out,
      totalGuests: row.total_guests,
      status
    },
    wifi: {
      ssid: `${row.property_name.replace(/\s+/g, '')}_Guest`,
      password: `welcome${new Date(row.check_in).getFullYear()}`
    },
    guests: guestsRes.rows
  };
}

module.exports = {
  getBookings,
  createBooking,
  updateBooking,
  checkIn,
  checkOut,
  getPublicRoom,
  createGuestBooking,
  getGuestStay
};
