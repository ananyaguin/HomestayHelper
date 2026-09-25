const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

/**
 * Authentication middleware that verifies an owner's JWT from the Authorization header.
 * Attaches the verified owner ID to req.ownerId.
 * Rejects missing, malformed, expired, or invalid tokens with HTTP 401 Unauthorized.
 */
function verifyOwnerJWT(req, res, next) {
  const authHeader = req.headers.authorization || req.header('Authorization');

  if (!authHeader || typeof authHeader !== 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = parts[1].trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('[Auth Middleware] JWT_SECRET environment variable is missing');
    return res.status(500).json({ error: 'Internal server error' });
  }

  try {
    const payload = jwt.verify(token, secret);

    if (!payload || !payload.ownerId || typeof payload.ownerId !== 'string' || payload.ownerId.trim().length === 0) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Attach verified ownerId from token payload only
    req.ownerId = payload.ownerId;
    return next();
  } catch (err) {
    // Covers TokenExpiredError, JsonWebTokenError, invalid signature, etc.
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

/**
 * Reusable database query helper enforcing owner-scoped parameterization.
 * Binds the authenticated ownerId as the first parameter ($1) to ensure queries
 * are always strictly scoped to the authenticated owner.
 *
 * @param {string} ownerId - Authenticated owner ID (from req.ownerId)
 * @param {string} queryText - SQL query string containing parameter placeholders
 * @param {Array} [params=[]] - Additional parameters for the query
 * @returns {Promise<import('pg').QueryResult>} - Query result from pg Pool
 */
async function scopedQuery(ownerId, queryText, params = []) {
  if (!ownerId || typeof ownerId !== 'string' || ownerId.trim().length === 0) {
    throw new Error('A valid ownerId is required for scoped queries');
  }

  // Prepend ownerId as $1 unless already explicitly provided as first element
  const queryParams = params.length > 0 && params[0] === ownerId
    ? params
    : [ownerId, ...params];

  return pool.query(queryText, queryParams);
}

module.exports = {
  verifyOwnerJWT,
  scopedQuery,
};
