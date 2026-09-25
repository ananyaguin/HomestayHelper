const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const propertiesRouter = require('./routes/properties');
const roomsRouter = require('./routes/rooms');
const bookingsRouter = require('./routes/bookings');
const guestRouter = require('./routes/guest');
const ledgerRouter = require('./routes/ledger');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/bookings/:id/ledger', ledgerRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/guest', guestRouter);
app.use('/api/properties/:propertyId/rooms', roomsRouter);
app.use('/api/properties', propertiesRouter);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Homestay Helper server is running'
  });
});

// 404 handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Internal server error' : (err.message || 'An error occurred')
  });
});

module.exports = app;
