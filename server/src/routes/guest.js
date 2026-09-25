const express = require('express');
const router = express.Router();
const bookingService = require('../services/bookingService');
const requestService = require('../services/requestService');

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
 * GET /api/guest/stay/:token
 * Retrieves active guest stay information using the stay token.
 */
router.get('/stay/:token', async (req, res) => {
  try {
    const stayData = await bookingService.getGuestStay(req.params.token);
    return res.status(200).json(stayData);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error fetching guest stay:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/guest/stay/:token/requests
 * Guest submits a request item for their active stay.
 */
router.post('/stay/:token/requests', async (req, res) => {
  try {
    const requestItem = await requestService.createGuestRequest(req.params.token, req.body || {});
    return res.status(201).json({ success: true, message: 'Request sent successfully', request: requestItem });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error creating guest request:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/guest/stay/:token/requests
 * Guest fetches all submitted requests for their active stay.
 */
router.get('/stay/:token/requests', async (req, res) => {
  try {
    const requests = await requestService.getGuestRequests(req.params.token);
    return res.status(200).json({ requests });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error fetching guest requests:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/guest/stay/:token/requests/:requestId/cancel
 * Guest cancels a pending request.
 */
router.patch('/stay/:token/requests/:requestId/cancel', async (req, res) => {
  try {
    const updated = await requestService.cancelGuestRequest(req.params.token, req.params.requestId);
    return res.status(200).json({ success: true, request: updated });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error cancelling guest request:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/guest/stay/:token/requests/:requestId/cancel
 * Support POST alias for cancel
 */
router.post('/stay/:token/requests/:requestId/cancel', async (req, res) => {
  try {
    const updated = await requestService.cancelGuestRequest(req.params.token, req.params.requestId);
    return res.status(200).json({ success: true, request: updated });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error cancelling guest request:', error.message);
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
