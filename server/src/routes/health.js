const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

router.get('/', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({
      status: 'ok',
      db: 'connected'
    });
  } catch (error) {
    console.error('Database health check failed:', error.message);
    return res.status(500).json({
      status: 'ok',
      db: 'error'
    });
  }
});

module.exports = router;
