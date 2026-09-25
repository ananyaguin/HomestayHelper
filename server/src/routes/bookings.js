const express = require('express');
const router = express.Router();
const { verifyOwnerJWT } = require('../middleware/auth');
const bookingService = require('../services/bookingService');
const ledgerRouter = require('./ledger');

// All booking routes require owner authentication
router.use(verifyOwnerJWT);

// Nested ledger router for booking entries
router.use('/:id/ledger', ledgerRouter);

/**
 * GET /api/bookings
 * Returns all bookings belonging to the authenticated owner.
 */
router.get('/', async (req, res) => {
  try {
    const bookings = await bookingService.getBookings(req.ownerId);
    return res.status(200).json({ bookings });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error fetching bookings:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/bookings
 * Creates a new booking and associated guest row. Initial status is 'upcoming'.
 */
router.post('/', async (req, res) => {
  try {
    const result = await bookingService.createBooking(req.ownerId, req.body || {});
    return res.status(201).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error creating booking:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/bookings/:id/check-in
 * State machine transition: upcoming -> checked_in
 */
router.patch('/:id/check-in', async (req, res) => {
  try {
    const result = await bookingService.checkIn(req.ownerId, req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error checking in booking:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/bookings/:id/check-out
 * State machine transition: checked_in -> checked_out
 */
router.patch('/:id/check-out', async (req, res) => {
  try {
    const result = await bookingService.checkOut(req.ownerId, req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error checking out booking:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/bookings/:id
 * Generic update of booking fields (guest_name, guest_phone, check_in, check_out, room_id).
 * Status cannot be changed through this generic endpoint.
 */
router.patch('/:id', async (req, res) => {
  try {
    const result = await bookingService.updateBooking(req.ownerId, req.params.id, req.body || {});
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error updating booking:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
