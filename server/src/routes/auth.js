const express = require('express');
const router = express.Router();
const authService = require('../services/authService');

router.post('/signup', async (req, res, next) => {
  try {
    const result = await authService.signup(req.body || {});
    return res.status(201).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    // Database unique constraint violation fallback
    if (error.code === '23505') {
      if (error.constraint && error.constraint.includes('phone')) {
        return res.status(409).json({ error: 'Phone number already registered' });
      }
      if (error.constraint && error.constraint.includes('email')) {
        return res.status(409).json({ error: 'Recovery email already registered' });
      }
      return res.status(409).json({ error: 'Account already exists' });
    }
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const result = await authService.login(req.body || {});
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
