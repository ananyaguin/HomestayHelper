const express = require('express');
const router = express.Router({ mergeParams: true });
const pool = require('../db/pool');
const { verifyOwnerJWT } = require('../middleware/auth');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.use(verifyOwnerJWT);

function formatExpense(row) {
  if (!row) return row;
  const pm = row.payment_method ? String(row.payment_method).toLowerCase() : 'cash';
  const amountStr = typeof row.amount === 'number'
    ? row.amount.toFixed(2)
    : (parseFloat(row.amount) || 0).toFixed(2);

  return {
    id: row.id,
    property_id: row.property_id,
    category: row.category,
    amount: amountStr,
    payment_method: pm,
    paymentMethod: pm,
    note: row.note || '',
    created_at: row.created_at,
    ...(row.property_name ? { property_name: row.property_name } : {})
  };
}

/**
 * GET /api/expenses
 * GET /api/properties/:propertyId/expenses
 * Returns all expenses scoped to the authenticated owner's properties.
 */
router.get('/', async (req, res) => {
  try {
    const propertyId = req.params.propertyId || req.query.propertyId;

    let query = `
      SELECT e.id, e.property_id, e.category, e.amount, e.payment_method, e.note, e.created_at, p.name AS property_name
      FROM expenses e
      JOIN properties p ON e.property_id = p.id
      WHERE p.owner_id = $1
    `;
    const params = [req.ownerId];

    if (propertyId) {
      if (!UUID_REGEX.test(propertyId)) {
        return res.status(404).json({ error: 'Property not found' });
      }
      query += ` AND e.property_id = $2`;
      params.push(propertyId);
    }

    query += ` ORDER BY e.created_at DESC, e.id DESC`;

    const result = await pool.query(query, params);
    return res.status(200).json({
      expenses: result.rows.map(formatExpense)
    });
  } catch (error) {
    console.error('Error fetching expenses:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/expenses
 * POST /api/properties/:propertyId/expenses
 * Creates a new expense scoped strictly to the authenticated owner's property.
 */
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    let targetPropertyId = req.params.propertyId || body.property_id || body.propertyId;

    // If propertyId not supplied, pick the owner's primary property
    if (!targetPropertyId) {
      const propRes = await pool.query('SELECT id FROM properties WHERE owner_id = $1 LIMIT 1', [req.ownerId]);
      if (propRes.rows.length === 0) {
        return res.status(400).json({ error: 'No property found for owner to assign expense' });
      }
      targetPropertyId = propRes.rows[0].id;
    } else {
      if (!UUID_REGEX.test(targetPropertyId)) {
        return res.status(404).json({ error: 'Property not found' });
      }
      // Verify property belongs to authenticated owner
      const propCheck = await pool.query('SELECT id FROM properties WHERE id = $1 AND owner_id = $2', [targetPropertyId, req.ownerId]);
      if (propCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Property not found' });
      }
    }

    // Validate category
    const category = typeof body.category === 'string' ? body.category.trim() : '';
    if (!category) {
      return res.status(400).json({ error: 'Expense category is required' });
    }

    // Validate amount
    if (body.amount === undefined || body.amount === null || body.amount === '') {
      return res.status(400).json({ error: 'Amount is required' });
    }
    const amountNum = Number(body.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: 'Amount must be a valid positive number' });
    }

    // Validate payment_method
    const rawMethod = body.payment_method || body.paymentMethod;
    let paymentMethod = 'cash';
    if (rawMethod && typeof rawMethod === 'string') {
      const norm = rawMethod.trim().toLowerCase();
      if (norm === 'upi' || norm === 'cash') {
        paymentMethod = norm;
      }
    }

    const note = typeof body.note === 'string' ? body.note.trim() : (typeof body.notes === 'string' ? body.notes.trim() : null);

    const insertSql = `
      INSERT INTO expenses (property_id, category, amount, payment_method, note)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, property_id, category, amount, payment_method, note, created_at
    `;
    const result = await pool.query(insertSql, [
      targetPropertyId,
      category,
      amountNum,
      paymentMethod,
      note
    ]);

    return res.status(201).json({
      expense: formatExpense(result.rows[0])
    });
  } catch (error) {
    console.error('Error creating expense:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
