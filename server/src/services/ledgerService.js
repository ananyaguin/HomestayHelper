const pool = require('../db/pool');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Formats a ledger entry row for API output.
 */
function formatLedgerEntry(row) {
  if (!row) return row;
  const amountStr = typeof row.amount === 'number'
    ? row.amount.toFixed(2)
    : (parseFloat(row.amount) || 0).toFixed(2);

  const pm = row.payment_method ? String(row.payment_method).toLowerCase() : (row.type === 'payment' ? 'upi' : null);

  return {
    id: row.id,
    booking_id: row.booking_id,
    type: row.type,
    amount: amountStr,
    currency: row.currency || 'INR',
    description: row.description || row.note || '',
    note: row.note || row.description || '',
    payment_method: pm,
    paymentMethod: pm,
    created_at: row.created_at
  };
}

/**
 * Verifies that the booking exists and belongs to the authenticated owner.
 * Ownership chain: booking -> room -> property -> owner
 * Returns the booking record if verified.
 * Throws 404 with {"error": "Booking not found"} if not found or belongs to another owner.
 */
async function verifyBookingOwnership(ownerId, bookingId) {
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

  const query = `
    SELECT b.id, b.room_id, r.property_id, p.owner_id
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    JOIN properties p ON r.property_id = p.id
    WHERE b.id = $1 AND p.owner_id = $2
  `;
  const result = await pool.query(query, [bookingId, ownerId]);

  if (result.rows.length === 0) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }

  return result.rows[0];
}

/**
 * Creates a ledger entry (charge or payment) for a booking using a PostgreSQL transaction.
 *
 * @param {string} ownerId - Authenticated owner ID from JWT
 * @param {string} bookingId - Target booking UUID
 * @param {object} data - { type, amount, description/note, currency, payment_method }
 */
async function createLedgerEntry(ownerId, bookingId, data) {
  // 1. Verify ownership (strictly booking -> room -> property -> owner)
  await verifyBookingOwnership(ownerId, bookingId);

  // 2. Validate input fields
  if (!data || typeof data !== 'object') {
    const err = new Error('Request body must be an object');
    err.status = 400;
    throw err;
  }

  const rawType = data.type;
  if (!rawType || typeof rawType !== 'string') {
    const err = new Error('Entry type is required and must be either "charge" or "payment"');
    err.status = 400;
    throw err;
  }

  const normalizedType = rawType.trim().toLowerCase();
  if (normalizedType !== 'charge' && normalizedType !== 'payment') {
    const err = new Error('Entry type must be either "charge" or "payment"');
    err.status = 400;
    throw err;
  }

  if (data.amount === undefined || data.amount === null || data.amount === '') {
    const err = new Error('Amount is required');
    err.status = 400;
    throw err;
  }

  const amountNum = Number(data.amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    const err = new Error('Amount must be a valid positive number');
    err.status = 400;
    throw err;
  }

  const description = typeof data.description === 'string'
    ? data.description.trim()
    : (typeof data.note === 'string' ? data.note.trim() : null);

  const currency = typeof data.currency === 'string' && data.currency.trim().length > 0
    ? data.currency.trim().toUpperCase()
    : 'INR';

  const rawPaymentMethod = data.payment_method || data.paymentMethod;
  const paymentMethod = typeof rawPaymentMethod === 'string' && rawPaymentMethod.trim().length > 0
    ? rawPaymentMethod.trim().toLowerCase()
    : (normalizedType === 'payment' ? 'cash' : null);

  // 3. PostgreSQL Transaction (BEGIN ... COMMIT ... ROLLBACK)
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertSql = `
      INSERT INTO ledger_entries (booking_id, type, amount, currency, note, description, payment_method)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, booking_id, type, amount, currency, note, description, payment_method, created_at
    `;
    const res = await client.query(insertSql, [
      bookingId,
      normalizedType,
      amountNum,
      currency,
      description,
      description,
      paymentMethod
    ]);

    await client.query('COMMIT');

    return formatLedgerEntry(res.rows[0]);
  } catch (txErr) {
    await client.query('ROLLBACK');
    throw txErr;
  } finally {
    client.release();
  }
}

/**
 * Retrieves all ledger entries for a booking along with total charges, total payments, and computed balance.
 *
 * @param {string} ownerId - Authenticated owner ID from JWT
 * @param {string} bookingId - Target booking UUID
 */
async function getLedger(ownerId, bookingId) {
  // 1. Verify ownership
  await verifyBookingOwnership(ownerId, bookingId);

  // 2. Query all entries for this booking
  const query = `
    SELECT id, booking_id, type, amount, currency, note, description, payment_method, created_at
    FROM ledger_entries
    WHERE booking_id = $1
    ORDER BY created_at ASC, id ASC
  `;
  const result = await pool.query(query, [bookingId]);

  let totalChargesNum = 0;
  let totalPaymentsNum = 0;

  const entries = result.rows.map(row => {
    const entry = formatLedgerEntry(row);
    const amountVal = parseFloat(row.amount) || 0;
    if (row.type === 'charge') {
      totalChargesNum += amountVal;
    } else if (row.type === 'payment') {
      totalPaymentsNum += amountVal;
    }
    return entry;
  });

  const balanceNum = totalChargesNum - totalPaymentsNum;

  return {
    entries,
    totalCharges: totalChargesNum.toFixed(2),
    totalPayments: totalPaymentsNum.toFixed(2),
    balance: balanceNum.toFixed(2),
    total_charges: totalChargesNum.toFixed(2),
    total_payments: totalPaymentsNum.toFixed(2)
  };
}

module.exports = {
  verifyBookingOwnership,
  createLedgerEntry,
  getLedger,
  formatLedgerEntry
};
