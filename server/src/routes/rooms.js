const express = require('express');
const router = express.Router({ mergeParams: true });
const { verifyOwnerJWT, scopedQuery } = require('../middleware/auth');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Middleware: Verify Property Ownership
 * Verifies that the property specified in req.params.propertyId exists and belongs
 * strictly to the authenticated owner (req.ownerId).
 * Returns 404 Not Found if nonexistent or owned by another owner (never reveals existence with 403).
 */
async function checkPropertyOwnership(req, res, next) {
  const { propertyId } = req.params;

  if (!propertyId || !UUID_REGEX.test(propertyId)) {
    return res.status(404).json({ error: 'Property not found' });
  }

  try {
    const result = await scopedQuery(
      req.ownerId,
      'SELECT id FROM properties WHERE id = $2 AND owner_id = $1',
      [req.ownerId, propertyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    return next();
  } catch (err) {
    console.error('Error verifying property ownership:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// All room routes require authentication followed by property ownership verification
router.use(verifyOwnerJWT);
router.use(checkPropertyOwnership);

/**
 * GET /api/properties/:propertyId/rooms
 * Returns all rooms belonging to the specified property.
 */
router.get('/', async (req, res) => {
  try {
    const { propertyId } = req.params;

    const query = `
      SELECT r.id, r.property_id, r.name, r.capacity, r.price, r.description, r.created_at
      FROM rooms r
      JOIN properties p ON r.property_id = p.id
      WHERE r.property_id = $2 AND p.owner_id = $1
      ORDER BY r.created_at ASC
    `;

    const result = await scopedQuery(req.ownerId, query, [req.ownerId, propertyId]);

    // If property has no rooms yet, auto-provision default system rooms (Room 101, 102, 103)
    // to treat rooms as system/property configuration rather than requiring manual creation
    if (result.rows.length === 0) {
      const defaultRooms = [
        { name: 'Room 101 — Deluxe Balcony', capacity: 2, price: 2000.00, description: 'Comfortable double room with valley view' },
        { name: 'Room 102 — Mountain Suite', capacity: 3, price: 2800.00, description: 'Spacious suite with scenic mountain balcony' },
        { name: 'Room 103 — Cozy Garden Room', capacity: 2, price: 1800.00, description: 'Quiet ground-floor room facing the tea garden' }
      ];

      for (const dr of defaultRooms) {
        await scopedQuery(
          req.ownerId,
          `INSERT INTO rooms (property_id, name, capacity, price, description)
           SELECT p.id, $3, $4, $5, $6
           FROM properties p
           WHERE p.id = $2 AND p.owner_id = $1`,
          [req.ownerId, propertyId, dr.name, dr.capacity, dr.price, dr.description]
        );
      }

      const refreshed = await scopedQuery(req.ownerId, query, [req.ownerId, propertyId]);
      return res.status(200).json({ rooms: refreshed.rows });
    }

    return res.status(200).json({
      rooms: result.rows
    });
  } catch (error) {
    console.error('Error fetching rooms:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/properties/:propertyId/rooms
 * Creates a new room under the verified property.
 * property_id is strictly derived from req.params.propertyId.
 */
router.post('/', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const body = req.body || {};

    // Validate name
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return res.status(400).json({ error: 'Room name is required' });
    }
    const name = body.name.trim();
    if (name.length > 255) {
      return res.status(400).json({ error: 'Room name must not exceed 255 characters' });
    }

    // Validate capacity
    if (body.capacity === undefined || body.capacity === null || body.capacity === '') {
      return res.status(400).json({ error: 'Capacity is required' });
    }
    const capacityNum = Number(body.capacity);
    if (!Number.isInteger(capacityNum) || capacityNum <= 0) {
      return res.status(400).json({ error: 'Capacity must be a positive integer' });
    }

    // Validate price
    if (body.price === undefined || body.price === null || body.price === '') {
      return res.status(400).json({ error: 'Price is required' });
    }
    const priceNum = Number(body.price);
    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ error: 'Price must be a valid non-negative number' });
    }

    // Optional description
    let description = null;
    if (body.description !== undefined && body.description !== null) {
      if (typeof body.description !== 'string') {
        return res.status(400).json({ error: 'Description must be a string' });
      }
      description = body.description.trim() || null;
    }

    // Enforce property_id from req.params.propertyId (ignore any client body property_id)
    const insertSql = `
      INSERT INTO rooms (property_id, name, capacity, price, description)
      SELECT p.id, $3, $4, $5, $6
      FROM properties p
      WHERE p.id = $2 AND p.owner_id = $1
      RETURNING *
    `;

    const result = await scopedQuery(req.ownerId, insertSql, [
      req.ownerId,
      propertyId,
      name,
      capacityNum,
      priceNum,
      description
    ]);

    return res.status(201).json({
      room: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating room:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/properties/:propertyId/rooms/:roomId
 * Updates editable fields of a room belonging to the specified property.
 * Returns 404 if room does not exist OR does not belong to propertyId.
 */
router.patch('/:roomId', async (req, res) => {
  try {
    const { propertyId, roomId } = req.params;

    if (!UUID_REGEX.test(roomId)) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const body = req.body || {};
    const setClauses = [];
    const values = [];

    // Allowed editable fields: name, capacity, price, description
    // id, property_id, owner_id, created_at are strictly prohibited from being modified

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return res.status(400).json({ error: 'Room name cannot be empty' });
      }
      if (body.name.trim().length > 255) {
        return res.status(400).json({ error: 'Room name must not exceed 255 characters' });
      }
      values.push(body.name.trim());
      setClauses.push(`name = $${values.length + 3}`);
    }

    if (body.capacity !== undefined) {
      const capacityNum = Number(body.capacity);
      if (!Number.isInteger(capacityNum) || capacityNum <= 0) {
        return res.status(400).json({ error: 'Capacity must be a positive integer' });
      }
      values.push(capacityNum);
      setClauses.push(`capacity = $${values.length + 3}`);
    }

    if (body.price !== undefined) {
      const priceNum = Number(body.price);
      if (isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({ error: 'Price must be a valid non-negative number' });
      }
      values.push(priceNum);
      setClauses.push(`price = $${values.length + 3}`);
    }

    if (body.description !== undefined) {
      if (body.description !== null && typeof body.description !== 'string') {
        return res.status(400).json({ error: 'Description must be a string or null' });
      }
      values.push(body.description ? body.description.trim() : null);
      setClauses.push(`description = $${values.length + 3}`);
    }

    // Reject empty update requests
    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No editable fields provided for update' });
    }

    // $1 = req.ownerId, $2 = roomId, $3 = propertyId, $4.. = values
    const updateSql = `
      UPDATE rooms r
      SET ${setClauses.join(', ')}
      FROM properties p
      WHERE r.property_id = p.id
        AND r.id = $2
        AND r.property_id = $3
        AND p.owner_id = $1
      RETURNING r.*
    `;

    const result = await scopedQuery(req.ownerId, updateSql, [
      req.ownerId,
      roomId,
      propertyId,
      ...values
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    return res.status(200).json({
      room: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating room:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/properties/:propertyId/rooms/:roomId
 * Deletes a room belonging to the specified property.
 * Returns 404 if room does not exist OR does not belong to propertyId.
 */
router.delete('/:roomId', async (req, res) => {
  try {
    const { propertyId, roomId } = req.params;

    if (!UUID_REGEX.test(roomId)) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // $1 = req.ownerId, $2 = roomId, $3 = propertyId
    const deleteSql = `
      DELETE FROM rooms r
      USING properties p
      WHERE r.property_id = p.id
        AND r.id = $2
        AND r.property_id = $3
        AND p.owner_id = $1
      RETURNING r.id
    `;

    const result = await scopedQuery(req.ownerId, deleteSql, [
      req.ownerId,
      roomId,
      propertyId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    return res.status(200).json({
      message: 'Room deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting room:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
