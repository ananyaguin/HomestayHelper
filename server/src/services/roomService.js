const pool = require('../db/pool');

/**
 * Synchronizes property room records in PostgreSQL based on property's total_rooms value.
 * Creates missing rooms up to total_rooms using generic names ("Room 1", "Room 2", ...).
 * Preserves all existing room records and custom names.
 */
async function syncRoomsForProperty(ownerId, propertyId) {
  if (!ownerId || !propertyId) return [];

  // 1. Get property total_rooms
  const propRes = await pool.query(
    'SELECT id, owner_id, total_rooms FROM properties WHERE id = $1 AND owner_id = $2',
    [propertyId, ownerId]
  );
  if (propRes.rows.length === 0) return [];

  const totalRooms = Math.max(1, propRes.rows[0].total_rooms || 1);

  // 2. Fetch existing rooms for this property
  const roomsRes = await pool.query(
    `SELECT r.id, r.property_id, r.name, r.capacity, r.price, r.description, r.created_at
     FROM rooms r
     JOIN properties p ON r.property_id = p.id
     WHERE r.property_id = $1 AND p.owner_id = $2
     ORDER BY r.created_at ASC`,
    [propertyId, ownerId]
  );

  const existingRooms = roomsRes.rows;
  const existingCount = existingRooms.length;

  // 3. Create missing rooms if existing count is less than configured total_rooms
  if (existingCount < totalRooms) {
    const missingCount = totalRooms - existingCount;

    for (let i = existingCount + 1; i <= totalRooms; i++) {
      const defaultName = `Room ${i}`;
      await pool.query(
        `INSERT INTO rooms (property_id, name, capacity, price, description)
         SELECT p.id, $2, 2, 2000.00, NULL
         FROM properties p
         WHERE p.id = $1 AND p.owner_id = $3`,
        [propertyId, defaultName, ownerId]
      );
    }

    // Refresh rooms list
    const refreshed = await pool.query(
      `SELECT r.id, r.property_id, r.name, r.capacity, r.price, r.description, r.created_at
       FROM rooms r
       JOIN properties p ON r.property_id = p.id
       WHERE r.property_id = $1 AND p.owner_id = $2
       ORDER BY r.created_at ASC`,
      [propertyId, ownerId]
    );
    return refreshed.rows.slice(0, totalRooms);
  }

  return existingRooms.slice(0, totalRooms);
}

module.exports = {
  syncRoomsForProperty
};
