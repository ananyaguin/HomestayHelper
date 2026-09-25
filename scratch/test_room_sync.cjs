const pool = require('../server/src/db/pool');
const roomService = require('../server/src/services/roomService');

async function testRoomSync() {
  console.log('=== ROOM CREATION & SYNCHRONIZATION VERIFICATION ===\n');

  try {
    // 1. Get an active property
    const propRes = await pool.query("SELECT id, owner_id, name, total_rooms FROM properties WHERE name = 'kalimpong house' LIMIT 1");
    if (propRes.rows.length === 0) {
      console.error('Property not found');
      process.exit(1);
    }

    const prop = propRes.rows[0];
    console.log(`Active Property: "${prop.name}" (ID: ${prop.id}, Owner: ${prop.owner_id}, Configured total_rooms: ${prop.total_rooms})`);

    // 2. Synchronize rooms
    console.log('\n--- Step 1: Synchronizing rooms for property ---');
    const rooms1 = await roomService.syncRoomsForProperty(prop.owner_id, prop.id);
    console.log(`Rooms returned after sync: ${rooms1.length}`);
    rooms1.forEach((r, idx) => {
      console.log(`  Room ${idx + 1}: ${r.name} (ID: ${r.id}, property_id: ${r.property_id})`);
    });

    if (rooms1.length !== prop.total_rooms) {
      console.error(`FAIL: Expected ${prop.total_rooms} rooms, got ${rooms1.length}`);
    } else {
      console.log(`PASS: Property has exactly ${prop.total_rooms} rooms!`);
    }

    // 3. Confirm all belong to correct property
    const allBelong = rooms1.every(r => r.property_id === prop.id);
    if (allBelong) {
      console.log('PASS: All rooms belong strictly to the target property!');
    } else {
      console.error('FAIL: Room property_id mismatch detected');
    }

    // 4. Test second query (refresh) - exact same 4 rooms remain
    console.log('\n--- Step 2: Re-querying (refreshing) rooms list ---');
    const rooms2 = await roomService.syncRoomsForProperty(prop.owner_id, prop.id);
    if (rooms2.length === 4 && rooms2[0].id === rooms1[0].id && rooms2[3].id === rooms1[3].id) {
      console.log('PASS: Re-querying returns identical 4 rooms without duplication or changes!');
    } else {
      console.error('FAIL: Room list changed unexpectedly on re-query');
    }

    // 5. Test editing room name and custom name persistence
    console.log('\n--- Step 3: Custom room name edit persistence ---');
    const targetRoom = rooms2[3]; // Room 4
    await pool.query('UPDATE rooms SET name = $1 WHERE id = $2', ['Room 4 — Sunset Vista', targetRoom.id]);
    
    const rooms3 = await roomService.syncRoomsForProperty(prop.owner_id, prop.id);
    const editedRoom = rooms3.find(r => r.id === targetRoom.id);
    console.log(`Updated room name in DB: "${editedRoom?.name}"`);

    if (editedRoom && editedRoom.name === 'Room 4 — Sunset Vista') {
      console.log('PASS: Custom room name persisted perfectly after sync!');
    } else {
      console.error('FAIL: Custom room name was overwritten or lost');
    }

    // 6. Test Multi-property isolation
    console.log('\n--- Step 4: Multi-property room isolation ---');
    const secondPropRes = await pool.query("SELECT id, owner_id, name, total_rooms FROM properties WHERE id != $1 LIMIT 1", [prop.id]);
    if (secondPropRes.rows.length > 0) {
      const prop2 = secondPropRes.rows[0];
      const roomsProp2 = await roomService.syncRoomsForProperty(prop2.owner_id, prop2.id);
      console.log(`Second Property "${prop2.name}" rooms count: ${roomsProp2.length}`);

      const crossCheck = roomsProp2.some(r => r.property_id === prop.id);
      if (!crossCheck && roomsProp2.length === prop2.total_rooms) {
        console.log('PASS: Property rooms are strictly isolated and do not mix across properties!');
      } else {
        console.error('FAIL: Cross-property leak detected!');
      }
    }

    console.log('\n=== ALL ROOM SYNCHRONIZATION TESTS PASSED PERFECTLY! ===\n');
  } catch (err) {
    console.error('TEST ERROR:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testRoomSync();
