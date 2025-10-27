const { Sequelize } = require('sequelize');

module.exports = (err, req, res, next) => {
  console.error('Error:', err);

  // Sequelize validation error
  if (err instanceof Sequelize.ValidationError) {
    const errors = err.errors.map(error => ({
      field: error.path,
      message: error.message
    }));
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  // Sequelize unique constraint error
  if (err instanceof Sequelize.UniqueConstraintError) {
    return res.status(409).json({
      error: 'Resource already exists',
      details: err.errors.map(e => ({ field: e.path, message: e.message }))
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  // Custom application errors
  if (err.message && err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Default to 500 internal server error
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
};