const pool = require('../server/src/db/pool');

async function inspectDb() {
  console.log('=== CURRENT DATABASE PROPERTIES & ROOMS ===\n');

  try {
    const props = await pool.query('SELECT id, owner_id, name, total_rooms, created_at FROM properties ORDER BY created_at DESC');
    console.log(`Found ${props.rows.length} properties:`);
    for (const p of props.rows) {
      console.log(`\nProperty ID: ${p.id}`);
      console.log(`Name: ${p.name}`);
      console.log(`Owner ID: ${p.owner_id}`);
      console.log(`total_rooms: ${p.total_rooms}`);

      const rooms = await pool.query('SELECT id, property_id, name, capacity, price, description FROM rooms WHERE property_id = $1 ORDER BY created_at ASC', [p.id]);
      console.log(`Actual rooms in DB (${rooms.rows.length}):`);
      rooms.rows.forEach((r, idx) => {
        console.log(`  Room ${idx + 1}: ${r.name} (ID: ${r.id}, Capacity: ${r.capacity}, Price: ₹${r.price})`);
      });
    }
  } catch (err) {
    console.error('Error inspecting DB:', err);
  } finally {
    await pool.end();
  }
}

inspectDb();
