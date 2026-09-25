const express = require('express');
const router = express.Router();
const bookingService = require('../services/bookingService');

/**
 * GET /api/guest/rooms/:roomId
 * Returns public room & property details for the guest QR booking page.
 * Unauthenticated endpoint.
 */
router.get('/rooms/:roomId', async (req, res) => {
  try {
    const room = await bookingService.getPublicRoom(req.params.roomId);
    return res.status(200).json({ room, ...room });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error fetching public room:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Support singular alias /room/:roomId
 */
router.get('/room/:roomId', async (req, res) => {
  try {
    const room = await bookingService.getPublicRoom(req.params.roomId);
    return res.status(200).json({ room, ...room });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error fetching public room:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/guest/rooms/:roomId/bookings
 * Guest creates a booking for the scanned room.
 * Backend strictly resolves roomId -> room -> property -> owner.
 * Any client-supplied owner_id or property_id is ignored.
 */
router.post('/rooms/:roomId/bookings', async (req, res) => {
  try {
    const result = await bookingService.createGuestBooking(req.params.roomId, req.body || {});
    return res.status(201).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error creating guest booking:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/guest/bookings
 * Guest creates a booking with room_id in body
 */
router.post('/bookings', async (req, res) => {
  try {
    const body = req.body || {};
    const roomId = body.room_id || body.roomId;
    const result = await bookingService.createGuestBooking(roomId, body);
    return res.status(201).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error creating guest booking:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
