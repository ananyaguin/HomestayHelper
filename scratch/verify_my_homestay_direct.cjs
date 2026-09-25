process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/homestayhelper_dev';
const { Pool } = require('../server/node_modules/pg');
const { syncRoomsForProperty } = require('../server/src/services/roomService');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function verify() {
  // Find "my homestay"
  const propRes = await pool.query("SELECT id, owner_id, name, total_rooms FROM properties WHERE name = 'my homestay'");
  if (propRes.rows.length === 0) {
    console.log('No property named "my homestay" found.');
    await pool.end();
    return;
  }

  const prop = propRes.rows[0];
  console.log(`Property "my homestay" found: ID=${prop.id}, owner_id=${prop.owner_id}, total_rooms=${prop.total_rooms}`);

  const activeRooms = await syncRoomsForProperty(prop.owner_id, prop.id);
  console.log(`syncRoomsForProperty returned ${activeRooms.length} active rooms for "my homestay":`);
  console.table(activeRooms.map(r => ({ id: r.id, property_id: r.property_id, name: r.name })));

  if (activeRooms.length === prop.total_rooms) {
    console.log(`SUCCESS: Visible room count (${activeRooms.length}) EXACTLY MATCHES property total_rooms (${prop.total_rooms})!`);
  } else {
    console.error(`FAILURE: Visible room count (${activeRooms.length}) DOES NOT MATCH property total_rooms (${prop.total_rooms})!`);
  }

  await pool.end();
}

verify().catch(err => console.error(err));
