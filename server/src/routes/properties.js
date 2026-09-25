const express = require('express');
const router = express.Router();
const { verifyOwnerJWT, scopedQuery } = require('../middleware/auth');
const roomsRouter = require('./rooms');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates and normalizes JSONB fields (emergency_contacts, amenities).
 * Returns the stringified JSON or throws a validation Error.
 */
function validateAndSerializeJson(val, fieldName) {
  if (val === undefined || val === null) {
    return '{}';
  }
  if (typeof val === 'object') {
    return JSON.stringify(val);
  }
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error(`'${fieldName}' must be a valid JSON object or array`);
      }
      return JSON.stringify(parsed);
    } catch {
      throw new Error(`'${fieldName}' must be a valid JSON object or array`);
    }
  }
  throw new Error(`'${fieldName}' must be a valid JSON object or array`);
}

/**
 * GET /api/properties
 * Returns all properties belonging strictly to the authenticated owner.
 */
router.get('/', verifyOwnerJWT, async (req, res) => {
  try {
    const result = await scopedQuery(
      req.ownerId,
      'SELECT id, owner_id, name, address, description, total_rooms, wifi_ssid, wifi_password, emergency_contacts, amenities, created_at FROM properties WHERE owner_id = $1 ORDER BY created_at DESC',
      [req.ownerId]
    );

    return res.status(200).json({
      properties: result.rows
    });
  } catch (error) {
    console.error('Error fetching properties:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/properties
 * Creates a new property for the authenticated owner.
 * owner_id is strictly derived from req.ownerId (JWT) and cannot be overridden by client input.
 */
router.post('/', verifyOwnerJWT, async (req, res) => {
  try {
    const body = req.body || {};

    // Validate required property name
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return res.status(400).json({ error: 'Property name is required' });
    }
    const name = body.name.trim();
    if (name.length > 255) {
      return res.status(400).json({ error: 'Property name must not exceed 255 characters' });
    }

    // Optional address
    let address = null;
    if (body.address !== undefined && body.address !== null) {
      if (typeof body.address !== 'string') {
        return res.status(400).json({ error: 'Address must be a string' });
      }
      address = body.address.trim() || null;
    }

    // Optional description
    let description = null;
    if (body.description !== undefined && body.description !== null) {
      if (typeof body.description !== 'string') {
        return res.status(400).json({ error: 'Description must be a string' });
      }
      description = body.description.trim() || null;
    }

    // Optional total_rooms (support total_rooms or totalRooms)
    let total_rooms = 4;
    const rawTotalRooms = body.total_rooms !== undefined ? body.total_rooms : body.totalRooms;
    if (rawTotalRooms !== undefined && rawTotalRooms !== null) {
      const parsedRooms = parseInt(rawTotalRooms, 10);
      if (isNaN(parsedRooms) || parsedRooms <= 0) {
        return res.status(400).json({ error: 'Total rooms must be a positive integer greater than 0' });
      }
      total_rooms = parsedRooms;
    }

    // Optional wifi_ssid (support wifi_ssid, wifiSsid, or wifi_details.ssid)
    let wifi_ssid = null;
    const rawWifiSsid = body.wifi_ssid !== undefined
      ? body.wifi_ssid
      : (body.wifiSsid !== undefined ? body.wifiSsid : body.wifi_details?.ssid);
    if (rawWifiSsid !== undefined && rawWifiSsid !== null) {
      if (typeof rawWifiSsid !== 'string') {
        return res.status(400).json({ error: 'wifi_ssid must be a string' });
      }
      if (rawWifiSsid.length > 255) {
        return res.status(400).json({ error: 'wifi_ssid must not exceed 255 characters' });
      }
      wifi_ssid = rawWifiSsid.trim() || null;
    }

    // Optional wifi_password (support wifi_password, wifiPassword, or wifi_details.password)
    let wifi_password = null;
    const rawWifiPassword = body.wifi_password !== undefined
      ? body.wifi_password
      : (body.wifiPassword !== undefined ? body.wifiPassword : body.wifi_details?.password);
    if (rawWifiPassword !== undefined && rawWifiPassword !== null) {
      if (typeof rawWifiPassword !== 'string') {
        return res.status(400).json({ error: 'wifi_password must be a string' });
      }
      if (rawWifiPassword.length > 255) {
        return res.status(400).json({ error: 'wifi_password must not exceed 255 characters' });
      }
      wifi_password = rawWifiPassword;
    }

    // Optional emergency_contacts (support emergency_contacts or emergencyContacts)
    let serializedContacts;
    const rawContacts = body.emergency_contacts !== undefined ? body.emergency_contacts : body.emergencyContacts;
    try {
      serializedContacts = validateAndSerializeJson(rawContacts, 'emergency_contacts');
    } catch (valErr) {
      return res.status(400).json({ error: valErr.message });
    }

    // Optional amenities
    let serializedAmenities;
    try {
      serializedAmenities = validateAndSerializeJson(body.amenities, 'amenities');
    } catch (valErr) {
      return res.status(400).json({ error: valErr.message });
    }

    // Strict owner scoping: req.ownerId is always bound as owner_id
    const insertSql = `
      INSERT INTO properties (
        owner_id,
        name,
        address,
        description,
        total_rooms,
        wifi_ssid,
        wifi_password,
        emergency_contacts,
        amenities
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await scopedQuery(req.ownerId, insertSql, [
      req.ownerId,
      name,
      address,
      description,
      total_rooms,
      wifi_ssid,
      wifi_password,
      serializedContacts,
      serializedAmenities
    ]);

    const newProperty = result.rows[0];

    // Automatically provision rooms according to total_rooms
    const { syncRoomsForProperty } = require('../services/roomService');
    await syncRoomsForProperty(req.ownerId, newProperty.id);

    return res.status(201).json({
      property: newProperty
    });
  } catch (error) {
    console.error('Error creating property:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/properties/:id
 * Updates an existing property belonging to the authenticated owner.
 * Returns 404 if property does not exist OR belongs to another owner.
 * Rejects empty updates or attempts to change owner_id.
 */
router.patch('/:id', verifyOwnerJWT, async (req, res) => {
  try {
    const propertyId = req.params.id;

    // Validate propertyId UUID format to prevent database syntax errors
    if (!UUID_REGEX.test(propertyId)) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const body = req.body || {};

    const setClauses = [];
    const values = [];

    // Allowed editable fields: name, address, wifi_ssid, wifi_password, emergency_contacts, amenities
    // owner_id is explicitly prohibited and ignored

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return res.status(400).json({ error: 'Property name cannot be empty' });
      }
      if (body.name.trim().length > 255) {
        return res.status(400).json({ error: 'Property name must not exceed 255 characters' });
      }
      values.push(body.name.trim());
      setClauses.push(`name = $${values.length + 2}`);
    }

    if (body.address !== undefined) {
      if (body.address !== null && typeof body.address !== 'string') {
        return res.status(400).json({ error: 'Address must be a string or null' });
      }
      values.push(body.address ? body.address.trim() : null);
      setClauses.push(`address = $${values.length + 2}`);
    }

    if (body.description !== undefined) {
      if (body.description !== null && typeof body.description !== 'string') {
        return res.status(400).json({ error: 'Description must be a string or null' });
      }
      values.push(body.description ? body.description.trim() : null);
      setClauses.push(`description = $${values.length + 2}`);
    }

    const rawTotalRooms = body.total_rooms !== undefined ? body.total_rooms : body.totalRooms;
    if (rawTotalRooms !== undefined) {
      const parsedRooms = parseInt(rawTotalRooms, 10);
      if (isNaN(parsedRooms) || parsedRooms <= 0) {
        return res.status(400).json({ error: 'Total rooms must be a positive integer greater than 0' });
      }
      values.push(parsedRooms);
      setClauses.push(`total_rooms = $${values.length + 2}`);
    }

    const rawWifiSsid = body.wifi_ssid !== undefined
      ? body.wifi_ssid
      : (body.wifiSsid !== undefined ? body.wifiSsid : body.wifi_details?.ssid);
    if (rawWifiSsid !== undefined) {
      if (rawWifiSsid !== null && typeof rawWifiSsid !== 'string') {
        return res.status(400).json({ error: 'wifi_ssid must be a string or null' });
      }
      if (typeof rawWifiSsid === 'string' && rawWifiSsid.length > 255) {
        return res.status(400).json({ error: 'wifi_ssid must not exceed 255 characters' });
      }
      values.push(rawWifiSsid ? rawWifiSsid.trim() : null);
      setClauses.push(`wifi_ssid = $${values.length + 2}`);
    }

    const rawWifiPassword = body.wifi_password !== undefined
      ? body.wifi_password
      : (body.wifiPassword !== undefined ? body.wifiPassword : body.wifi_details?.password);
    if (rawWifiPassword !== undefined) {
      if (rawWifiPassword !== null && typeof rawWifiPassword !== 'string') {
        return res.status(400).json({ error: 'wifi_password must be a string or null' });
      }
      if (typeof rawWifiPassword === 'string' && rawWifiPassword.length > 255) {
        return res.status(400).json({ error: 'wifi_password must not exceed 255 characters' });
      }
      values.push(rawWifiPassword);
      setClauses.push(`wifi_password = $${values.length + 2}`);
    }

    const rawContacts = body.emergency_contacts !== undefined ? body.emergency_contacts : body.emergencyContacts;
    if (rawContacts !== undefined) {
      try {
        const serialized = validateAndSerializeJson(rawContacts, 'emergency_contacts');
        values.push(serialized);
        setClauses.push(`emergency_contacts = $${values.length + 2}`);
      } catch (valErr) {
        return res.status(400).json({ error: valErr.message });
      }
    }

    if (body.amenities !== undefined) {
      try {
        const serialized = validateAndSerializeJson(body.amenities, 'amenities');
        values.push(serialized);
        setClauses.push(`amenities = $${values.length + 2}`);
      } catch (valErr) {
        return res.status(400).json({ error: valErr.message });
      }
    }

    // Reject empty update requests or requests with no editable fields
    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No editable fields provided for update' });
    }

    // $1 = req.ownerId, $2 = propertyId, $3.. = values
    const updateSql = `
      UPDATE properties
      SET ${setClauses.join(', ')}
      WHERE id = $2 AND owner_id = $1
      RETURNING *
    `;

    const result = await scopedQuery(req.ownerId, updateSql, [
      req.ownerId,
      propertyId,
      ...values
    ]);

    // If no row was updated, the property either does not exist OR belongs to another owner.
    // Return 404 to avoid leaking existence of cross-owner properties.
    const updatedProperty = result.rows[0];

    // Synchronize rooms in case total_rooms was updated
    const { syncRoomsForProperty } = require('../services/roomService');
    await syncRoomsForProperty(req.ownerId, propertyId);

    return res.status(200).json({
      property: updatedProperty
    });
  } catch (error) {
    console.error('Error updating property:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const requestService = require('../services/requestService');

/**
 * GET /api/properties/:propertyId/requests
 * Returns all guest requests belonging strictly to the authenticated owner's property.
 */
router.get('/:propertyId/requests', verifyOwnerJWT, async (req, res) => {
  try {
    const requests = await requestService.getOwnerPropertyRequests(req.ownerId, req.params.propertyId);
    return res.status(200).json({ requests });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error fetching owner property requests:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/properties/:propertyId/requests/:requestId
 * Updates status of a guest request belonging to the authenticated owner's property.
 */
router.patch('/:propertyId/requests/:requestId', verifyOwnerJWT, async (req, res) => {
  try {
    const { status } = req.body || {};
    const updated = await requestService.updateRequestStatus(
      req.ownerId,
      req.params.propertyId,
      req.params.requestId,
      status
    );
    return res.status(200).json({ request: updated });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error updating guest request status:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/properties/:propertyId/requests/:requestId
 * Removes a completed, rejected, or cancelled request from the property's list.
 */
router.delete('/:propertyId/requests/:requestId', verifyOwnerJWT, async (req, res) => {
  try {
    const result = await requestService.removeOwnerPropertyRequest(
      req.ownerId,
      req.params.propertyId,
      req.params.requestId
    );
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error removing guest request:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.use('/:propertyId/rooms', roomsRouter);

module.exports = router;
