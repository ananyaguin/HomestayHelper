const pool = require('../db/pool');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves booking ID from stay token.
 */
async function getBookingIdFromToken(token) {
  if (!token) {
    const err = new Error('Guest stay token is required');
    err.status = 400;
    throw err;
  }

  const query = `
    SELECT 
      gt.booking_id,
      gt.expires_at,
      gt.status AS token_status,
      b.check_out
    FROM guest_tokens gt
    JOIN bookings b ON gt.booking_id = b.id
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
    const err = new Error('Stay expired');
    err.status = 403;
    throw err;
  }

  return row.booking_id;
}

/**
 * Creates a new guest request for an active stay.
 */
async function createGuestRequest(token, data) {
  const bookingId = await getBookingIdFromToken(token);

  const rawItem = typeof data.item === 'string' ? data.item.trim() : (typeof data.type === 'string' ? data.type.trim() : '');
  if (!rawItem) {
    const err = new Error('Request item is required');
    err.status = 400;
    throw err;
  }

  const note = typeof data.note === 'string' ? data.note.trim() : null;

  const insertSql = `
    INSERT INTO guest_requests (booking_id, type, status, note)
    VALUES ($1, $2, 'PENDING', $3)
    RETURNING id, booking_id, type, status, note, created_at, resolved_at
  `;

  const result = await pool.query(insertSql, [bookingId, rawItem, note]);
  return result.rows[0];
}

/**
 * Retrieves all requests submitted by the guest for their active stay.
 */
async function getGuestRequests(token) {
  const bookingId = await getBookingIdFromToken(token);

  const query = `
    SELECT id, booking_id, type, status, note, created_at, resolved_at
    FROM guest_requests
    WHERE booking_id = $1
    ORDER BY created_at DESC
  `;

  const result = await pool.query(query, [bookingId]);
  return result.rows;
}

/**
 * Retrieves all guest requests belonging strictly to the authenticated owner's property.
 */
async function getOwnerPropertyRequests(ownerId, propertyId) {
  if (!ownerId) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }

  if (!propertyId || !UUID_REGEX.test(propertyId)) {
    const err = new Error('Property not found');
    err.status = 404;
    throw err;
  }

  const query = `
    SELECT 
      gr.id,
      gr.booking_id,
      gr.type,
      gr.status,
      gr.note,
      gr.created_at,
      gr.resolved_at,
      b.guest_name,
      b.guest_phone,
      r.name AS room_name,
      p.id AS property_id,
      p.name AS property_name
    FROM guest_requests gr
    JOIN bookings b ON gr.booking_id = b.id
    JOIN rooms r ON b.room_id = r.id
    JOIN properties p ON r.property_id = p.id
    WHERE p.owner_id = $1 AND p.id = $2
    ORDER BY gr.created_at DESC
  `;

  const result = await pool.query(query, [ownerId, propertyId]);
  return result.rows;
}

/**
 * Updates status of a guest request for an authenticated owner's property.
 */
async function updateRequestStatus(ownerId, propertyId, requestId, newStatus) {
  if (!ownerId) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }

  if (!propertyId || !UUID_REGEX.test(propertyId)) {
    const err = new Error('Property not found');
    err.status = 404;
    throw err;
  }

  if (!requestId || !UUID_REGEX.test(requestId)) {
    const err = new Error('Request not found');
    err.status = 404;
    throw err;
  }

  const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED'];
  const statusUpper = String(newStatus || '').toUpperCase().trim();
  if (!validStatuses.includes(statusUpper)) {
    const err = new Error('Invalid status value');
    err.status = 400;
    throw err;
  }

  const updateSql = `
    UPDATE guest_requests
    SET status = $4::varchar,
        resolved_at = CASE WHEN $4::text IN ('COMPLETED', 'REJECTED', 'CANCELLED') THEN CURRENT_TIMESTAMP ELSE NULL END
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    JOIN properties p ON r.property_id = p.id
    WHERE guest_requests.booking_id = b.id
      AND guest_requests.id = $3
      AND p.id = $2
      AND p.owner_id = $1
    RETURNING guest_requests.id, guest_requests.booking_id, guest_requests.type, guest_requests.status, guest_requests.note, guest_requests.created_at, guest_requests.resolved_at, b.guest_name, r.name AS room_name
  `;

  const result = await pool.query(updateSql, [ownerId, propertyId, requestId, statusUpper]);
  if (result.rows.length === 0) {
    const err = new Error('Request not found');
    err.status = 404;
    throw err;
  }

  return result.rows[0];
}

/**
 * Guest cancels a pending request for their active stay.
 */
async function cancelGuestRequest(token, requestId) {
  const bookingId = await getBookingIdFromToken(token);

  if (!requestId || !UUID_REGEX.test(requestId)) {
    const err = new Error('Request not found');
    err.status = 404;
    throw err;
  }

  const checkSql = `SELECT status FROM guest_requests WHERE id = $1 AND booking_id = $2`;
  const checkRes = await pool.query(checkSql, [requestId, bookingId]);
  if (checkRes.rows.length === 0) {
    const err = new Error('Request not found');
    err.status = 404;
    throw err;
  }

  const currentStatus = (checkRes.rows[0].status || '').toUpperCase();
  if (currentStatus !== 'PENDING') {
    const err = new Error('Only pending requests can be cancelled');
    err.status = 400;
    throw err;
  }

  const updateSql = `
    UPDATE guest_requests
    SET status = 'CANCELLED',
        resolved_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND booking_id = $2
    RETURNING id, booking_id, type, status, note, created_at, resolved_at
  `;

  const result = await pool.query(updateSql, [requestId, bookingId]);
  return result.rows[0];
}

/**
 * Removes a completed, rejected, or cancelled guest request for an authenticated owner's property.
 */
async function removeOwnerPropertyRequest(ownerId, propertyId, requestId) {
  if (!ownerId) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }

  if (!propertyId || !UUID_REGEX.test(propertyId)) {
    const err = new Error('Property not found');
    err.status = 404;
    throw err;
  }

  if (!requestId || !UUID_REGEX.test(requestId)) {
    const err = new Error('Request not found');
    err.status = 404;
    throw err;
  }

  const checkSql = `
    SELECT gr.status 
    FROM guest_requests gr
    JOIN bookings b ON gr.booking_id = b.id
    JOIN rooms r ON b.room_id = r.id
    JOIN properties p ON r.property_id = p.id
    WHERE gr.id = $3 AND p.id = $2 AND p.owner_id = $1
  `;
  const checkRes = await pool.query(checkSql, [ownerId, propertyId, requestId]);
  if (checkRes.rows.length === 0) {
    const err = new Error('Request not found');
    err.status = 404;
    throw err;
  }

  const status = (checkRes.rows[0].status || '').toUpperCase();
  if (!['COMPLETED', 'REJECTED', 'CANCELLED'].includes(status)) {
    const err = new Error('Only completed, rejected, or cancelled requests can be removed');
    err.status = 400;
    throw err;
  }

  const deleteSql = `
    DELETE FROM guest_requests
    WHERE id = $3
      AND booking_id IN (
        SELECT b.id FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        JOIN properties p ON r.property_id = p.id
        WHERE p.id = $2 AND p.owner_id = $1
      )
    RETURNING id
  `;

  await pool.query(deleteSql, [ownerId, propertyId, requestId]);
  return { success: true, id: requestId };
}

module.exports = {
  getBookingIdFromToken,
  createGuestRequest,
  getGuestRequests,
  getOwnerPropertyRequests,
  updateRequestStatus,
  cancelGuestRequest,
  removeOwnerPropertyRequest
};
