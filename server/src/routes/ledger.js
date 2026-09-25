const express = require('express');
const router = express.Router({ mergeParams: true });
const { verifyOwnerJWT } = require('../middleware/auth');
const ledgerService = require('../services/ledgerService');

// All ledger endpoints require owner authentication
router.use(verifyOwnerJWT);

/**
 * GET /api/bookings/:id/ledger
 * Returns all ledger entries, totalCharges, totalPayments, and calculated balance.
 * Returns 404 Not Found if booking doesn't exist or belongs to another owner.
 */
router.get(['/', '/:id/ledger'], async (req, res) => {
  try {
    const bookingId = req.params.id || req.params.bookingId;
    const ledger = await ledgerService.getLedger(req.ownerId, bookingId);
    return res.status(200).json(ledger);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error fetching ledger:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/bookings/:id/ledger
 * Creates a new ledger entry (charge or payment) using a PostgreSQL transaction.
 * Scoped strictly to the authenticated owner's booking.
 */
router.post(['/', '/:id/ledger'], async (req, res) => {
  try {
    const bookingId = req.params.id || req.params.bookingId;
    const entry = await ledgerService.createLedgerEntry(req.ownerId, bookingId, req.body || {});
    return res.status(201).json({
      ...entry,
      entry
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error creating ledger entry:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
