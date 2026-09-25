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

/**
 * PATCH /api/expenses/:id
 * Updates an existing expense scoped strictly to the authenticated owner.
 * Returns 404 if nonexistent or owned by another owner.
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // 1. Verify expense exists and belongs to the authenticated owner
    const checkSql = `
      SELECT e.id, e.property_id, e.category, e.amount, e.payment_method, e.note
      FROM expenses e
      JOIN properties p ON e.property_id = p.id
      WHERE e.id = $1 AND p.owner_id = $2
    `;
    const checkRes = await pool.query(checkSql, [id, req.ownerId]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const body = req.body || {};
    const setClauses = [];
    const values = [];

    // Category
    if (body.category !== undefined) {
      if (typeof body.category !== 'string' || body.category.trim().length === 0) {
        return res.status(400).json({ error: 'Expense category cannot be empty' });
      }
      values.push(body.category.trim());
      setClauses.push(`category = $${values.length}`);
    }

    // Amount
    if (body.amount !== undefined) {
      const amountNum = Number(body.amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return res.status(400).json({ error: 'Amount must be a valid positive number' });
      }
      values.push(amountNum);
      setClauses.push(`amount = $${values.length}`);
    }

    // Payment Method
    const rawMethod = body.payment_method !== undefined ? body.payment_method : body.paymentMethod;
    if (rawMethod !== undefined) {
      if (typeof rawMethod !== 'string') {
        return res.status(400).json({ error: 'Payment method must be cash or upi' });
      }
      const norm = rawMethod.trim().toLowerCase();
      if (norm !== 'cash' && norm !== 'upi') {
        return res.status(400).json({ error: 'Payment method must be cash or upi' });
      }
      values.push(norm);
      setClauses.push(`payment_method = $${values.length}`);
    }

    // Note
    const rawNote = body.note !== undefined ? body.note : body.notes;
    if (rawNote !== undefined) {
      const noteStr = typeof rawNote === 'string' ? rawNote.trim() : null;
      values.push(noteStr);
      setClauses.push(`note = $${values.length}`);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No editable fields provided for update' });
    }

    values.push(id);
    const updateSql = `
      UPDATE expenses
      SET ${setClauses.join(', ')}
      WHERE id = $${values.length}
      RETURNING id, property_id, category, amount, payment_method, note, created_at
    `;

    const updateRes = await pool.query(updateSql, values);
    return res.status(200).json({
      expense: formatExpense(updateRes.rows[0])
    });
  } catch (error) {
    console.error('Error updating expense:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/expenses/:id
 * Deletes an existing expense scoped strictly to the authenticated owner.
 * Returns 404 if nonexistent or owned by another owner.
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const deleteSql = `
      DELETE FROM expenses e
      USING properties p
      WHERE e.property_id = p.id
        AND e.id = $1
        AND p.owner_id = $2
      RETURNING e.id
    `;
    const result = await pool.query(deleteSql, [id, req.ownerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    return res.status(200).json({
      message: 'Expense deleted successfully',
      id
    });
  } catch (error) {
    console.error('Error deleting expense:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
