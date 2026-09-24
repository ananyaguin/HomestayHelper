const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

class AuthError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
    this.name = 'AuthError';
  }
}

function generateToken(ownerId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is missing');
  }
  return jwt.sign({ ownerId }, secret, { expiresIn: '7d' });
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhone(phone) {
  // Allow digits with optional leading + and spaces or hyphens, 7 to 20 digits total
  const cleaned = phone.replace(/[\s-]/g, '');
  return /^\+?\d{7,15}$/.test(cleaned);
}

async function signup({ name, phone, recoveryEmail, password, confirmPassword }) {
  // 1. Field presence validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new AuthError('Name is required', 400);
  }

  if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
    throw new AuthError('Phone number is required', 400);
  }

  if (!recoveryEmail || typeof recoveryEmail !== 'string' || recoveryEmail.trim().length === 0) {
    throw new AuthError('Recovery email is required', 400);
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    throw new AuthError('Password is required', 400);
  }

  if (!confirmPassword || typeof confirmPassword !== 'string' || confirmPassword.length === 0) {
    throw new AuthError('Confirm password is required', 400);
  }

  // 2. Format validation
  const trimmedName = name.trim();
  const trimmedPhone = phone.trim();
  const trimmedEmail = recoveryEmail.trim().toLowerCase();

  if (!validatePhone(trimmedPhone)) {
    throw new AuthError('Phone number format is invalid', 400);
  }

  if (!validateEmail(trimmedEmail)) {
    throw new AuthError('Recovery email is invalid', 400);
  }

  // 3. Confirm password match
  if (password !== confirmPassword) {
    throw new AuthError('Passwords do not match', 400);
  }

  // 4. Duplicate checks
  const existingPhone = await pool.query('SELECT id FROM owners WHERE phone = $1', [trimmedPhone]);
  if (existingPhone.rows.length > 0) {
    throw new AuthError('Phone number already registered', 409);
  }

  const existingEmail = await pool.query('SELECT id FROM owners WHERE email = $1', [trimmedEmail]);
  if (existingEmail.rows.length > 0) {
    throw new AuthError('Recovery email already registered', 409);
  }

  // 5. Password hashing
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // 6. Database insert
  const insertQuery = `
    INSERT INTO owners (name, phone, email, password_hash)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, phone, email
  `;
  const result = await pool.query(insertQuery, [trimmedName, trimmedPhone, trimmedEmail, passwordHash]);
  const newOwner = result.rows[0];

  // 7. JWT generation
  const token = generateToken(newOwner.id);

  // 8. Return response contract
  return {
    owner: {
      id: newOwner.id,
      name: newOwner.name,
      phone: newOwner.phone,
      recoveryEmail: newOwner.email,
    },
    token,
  };
}

async function login({ phone, password }) {
  if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
    throw new AuthError('Phone number is required', 400);
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    throw new AuthError('Password is required', 400);
  }

  const trimmedPhone = phone.trim();

  // Find owner by phone
  const query = 'SELECT id, name, phone, email, password_hash FROM owners WHERE phone = $1';
  const result = await pool.query(query, [trimmedPhone]);

  if (result.rows.length === 0) {
    throw new AuthError('Invalid phone number or password', 401);
  }

  const owner = result.rows[0];

  // Compare password hash
  const isMatch = await bcrypt.compare(password, owner.password_hash);
  if (!isMatch) {
    throw new AuthError('Invalid phone number or password', 401);
  }

  // Generate JWT
  const token = generateToken(owner.id);

  return {
    owner: {
      id: owner.id,
      name: owner.name,
      phone: owner.phone,
      recoveryEmail: owner.email,
    },
    token,
  };
}

module.exports = {
  signup,
  login,
  generateToken,
  AuthError,
};
